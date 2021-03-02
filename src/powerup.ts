import {Asset} from '@greymass/eosio'

import {Resources} from '.'
import {PowerUpState} from './abi-types'

export class PowerUpAPI {
    constructor(private parent: Resources) {}

    async get_state(): Promise<PowerUpState> {
        const response = await this.parent.api.v1.chain.get_table_rows({
            code: 'eosio',
            scope: '',
            table: 'powup.state',
            type: PowerUpState,
        })
        return response.rows[0]
    }

    get_reserved(state: PowerUpState, resource: string): number {
        const {utilization, weight} = state[resource]
        return Number(utilization) / Number(weight)
    }

    get_allocated(state: PowerUpState): number {
        const {weight_ratio} = state.cpu
        return 1 - Number(weight_ratio) / this.parent.rex_target_weight / 100
    }

    get_price_per_ms(state: PowerUpState, ms = 1): Asset {
        // Retrieve state
        const allocated = this.get_allocated(state)

        // Casting EOSIO types to usable formats for JS calculations
        let adjusted_utilization = Number(state.cpu.adjusted_utilization)
        const decay_secs = Number(state.cpu.decay_secs.value)
        const exponent = Number(state.cpu.exponent)
        const max_price: number = state.cpu.max_price.value
        const min_price: number = state.cpu.min_price.value
        const utilization = Number(state.cpu.utilization)
        const utilization_timestamp = Number(state.cpu.utilization_timestamp.value)
        const weight = Number(state.cpu.weight)

        // Milliseconds available per day available in PowerUp (factoring in shift)
        const mspdAvailable = this.parent.mspd * allocated

        // Percentage to rent
        const percentToRent = ms / mspdAvailable
        const utilization_increase = weight * percentToRent

        // If utilization is less than adjusted, calculate real time value
        if (utilization < adjusted_utilization) {
            // Create now & adjust JS timestamp to match EOSIO timestamp values
            const now: number = Math.floor(Date.now() / 1000)
            const diff: number = adjusted_utilization - utilization
            let delta: number = Math.floor(
                diff * Math.exp(-(now - utilization_timestamp) / decay_secs)
            )
            delta = Math.min(Math.max(delta, 0), diff) // Clamp the delta
            adjusted_utilization = utilization + delta
        }

        const price_integral_delta = (
            start_utilization: number,
            end_utilization: number
        ): number => {
            const coefficient = (max_price - min_price) / exponent
            const start_u = start_utilization / weight
            const end_u = end_utilization / weight
            return (
                min_price * end_u -
                min_price * start_u +
                coefficient * Math.pow(end_u, exponent) -
                coefficient * Math.pow(start_u, exponent)
            )
        }

        const price_function = (utilization: number): number => {
            let price = min_price
            const new_exponent = exponent - 1.0
            if (new_exponent <= 0.0) {
                return max_price
            } else {
                price += (max_price - min_price) * Math.pow(utilization / weight, new_exponent)
            }
            return price
        }

        let fee = 0
        let start_utilization: number = utilization
        const end_utilization: number = start_utilization + utilization_increase

        if (start_utilization < adjusted_utilization) {
            fee +=
                (price_function(adjusted_utilization) *
                    Math.min(utilization_increase, adjusted_utilization - start_utilization)) /
                weight
            start_utilization = adjusted_utilization
        }

        if (start_utilization < end_utilization) {
            fee += price_integral_delta(start_utilization, end_utilization)
        }
        return Asset.fromUnits(Math.ceil(fee * 10000), this.parent.symbol)
    }
}
