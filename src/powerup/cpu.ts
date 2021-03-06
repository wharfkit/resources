import {Struct, UInt128} from '@greymass/eosio'

import {BNPrecision, SampleUsage} from '..'
import {PowerUpStateResource} from './abstract'
import {PowerUpStateOptions} from './options'

@Struct.type('powerupstateresourcecpu')
export class PowerUpStateResourceCPU extends PowerUpStateResource {
    per_day(options?: PowerUpStateOptions) {
        const limit =
            options && options.virtual_block_cpu_limit
                ? options.virtual_block_cpu_limit
                : this.default_block_cpu_limit
        return Number(limit) * 2 * 60 * 60 * 24
    }

    ms_per_day(options?: PowerUpStateOptions) {
        return this.per_day(options) / 1000
    }

    weight_to_us(sample: UInt128, us: number): number {
        return Math.ceil((us * Number(sample)) / BNPrecision)
    }

    us_to_weight(sample: UInt128, us: number): number {
        return Math.floor((us / Number(sample)) * BNPrecision)
    }

    frac(usage: SampleUsage, us: number) {
        const {weight} = this.cast()
        const frac = this.us_to_weight(usage.cpu, us) / weight
        return Math.floor(frac * Math.pow(10, 15))
    }

    price_per_ms(usage: SampleUsage, ms = 1, options?: PowerUpStateOptions): number {
        return this.price_per_us(usage, ms * 1000, options)
    }

    price_per_us(usage: SampleUsage, us = 1000, options?: PowerUpStateOptions): number {
        // Determine the utilization increase by this action
        const utilization_increase = this.utilization_increase(usage.cpu, us)

        // Determine the adjusted utilization if needed
        const adjusted_utilization = this.determine_adjusted_utilization(options)

        // Derive the fee from the increase and utilization
        const fee = this.fee(utilization_increase, adjusted_utilization)

        // Force the fee up to the next highest value of precision
        const precision = Math.pow(10, 4)
        const value = Math.ceil(fee * precision) / precision

        // Return the modified fee
        return value
    }
}
