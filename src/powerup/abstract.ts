import {
    Asset,
    Float64,
    Int64,
    Struct,
    TimePointSec,
    UInt128,
    UInt32,
    UInt64,
    UInt8,
} from '@wharfkit/antelope'
import BN from 'bn.js'

import {intToBigDecimal} from '..'
import {PowerUpStateOptions} from './options'

export abstract class PowerUpStateResource extends Struct {
    @Struct.field('uint8') version!: UInt8
    @Struct.field('int64') weight!: Int64
    @Struct.field('int64') weight_ratio!: Int64
    @Struct.field('int64') assumed_stake_weight!: Int64
    @Struct.field('int64') initial_weight_ratio!: Int64
    @Struct.field('int64') target_weight_ratio!: Int64
    @Struct.field('time_point_sec') initial_timestamp!: TimePointSec
    @Struct.field('time_point_sec') target_timestamp!: TimePointSec
    @Struct.field('float64') exponent!: Float64
    @Struct.field('uint32') decay_secs!: UInt32
    @Struct.field('asset') min_price!: Asset
    @Struct.field('asset') max_price!: Asset
    @Struct.field('int64') utilization!: Int64
    @Struct.field('int64') adjusted_utilization!: Int64
    @Struct.field('time_point_sec') utilization_timestamp!: TimePointSec

    readonly default_block_cpu_limit: UInt64 = UInt64.from(200000)
    readonly default_block_net_limit: UInt64 = UInt64.from(1048576000)

    abstract per_day(options?: PowerUpStateOptions): number

    // Get the current number of allocated units (shift from REX -> PowerUp)
    public get allocated_legacy() {
        return 1 - Number(this.weight_ratio) / Number(this.target_weight_ratio) / 100
    }

    public get allocated(): number {
        return 1 - Number(this.weight_ratio.dividing(this.target_weight_ratio)) / 100
    }

    // Get the current percentage of reserved units
    public get reserved_legacy() {
        return new BN(String(this.utilization)) / new BN(String(this.weight))
    }

    public get reserved(): Int64 {
        return this.utilization.dividing(this.weight)
    }

    // Get the symbol definition for the token
    public get symbol() {
        return this.min_price.symbol
    }

    // Mimic: https://github.com/EOSIO/eosio.contracts/blob/d7bc0a5cc8c0c2edd4dc61b0126517d0cb46fd94/contracts/eosio.system/src/powerup.cpp#L358
    utilization_increase_legacy(frac) {
        const {weight} = this
        const frac128 = UInt128.from(frac)
        const utilization_increase =
            new BN(weight.value.mul(new BN(frac128.value))) / Math.pow(10, 15)
        return Math.ceil(utilization_increase)
    }

    utilization_increase(frac: UInt128) {
        const base = intToBigDecimal(frac)
        const weight = intToBigDecimal(this.weight)
        const multiplier = intToBigDecimal(Math.pow(10, 15))
        return UInt128.from(base.multiply(weight).divide(multiplier, 15).ceil().getValue())
    }

    // Mimic: https://github.com/EOSIO/eosio.contracts/blob/d7bc0a5cc8c0c2edd4dc61b0126517d0cb46fd94/contracts/eosio.system/src/powerup.cpp#L284-L298
    price_function_legacy(utilization: Int64): number {
        const {exponent, weight} = this
        const max_price: number = this.max_price.value
        const min_price: number = this.min_price.value
        let price = min_price
        const new_exponent = Number(exponent) - 1.0
        if (new_exponent <= 0.0) {
            return max_price
        } else {
            const util_weight = intToBigDecimal(utilization).divide(intToBigDecimal(weight), 18)
            const difference = max_price - min_price
            price += difference * Math.pow(Number(util_weight.getValue()), new_exponent)
        }
        return price
    }

    price_function(utilization: Int64): number {
        const {weight} = this
        let price = this.min_price.value
        const new_exponent = Number(this.exponent) - 1.0
        if (new_exponent <= 0.0) {
            return this.max_price.value
        } else {
            // const util_weight = utilization.dividing(weight)
            const util_weight = intToBigDecimal(utilization).divide(intToBigDecimal(weight), 18)
            const difference = this.max_price.value - this.min_price.value
            price += difference * Math.pow(Number(util_weight.getValue()), new_exponent)
        }
        return price
    }

    // Mimic: https://github.com/EOSIO/eosio.contracts/blob/d7bc0a5cc8c0c2edd4dc61b0126517d0cb46fd94/contracts/eosio.system/src/powerup.cpp#L274-L280
    price_integral_delta_legacy(start_utilization: Int64, end_utilization: Int64): number {
        const {exponent, weight} = this
        const max_price: number = this.max_price.value
        const min_price: number = this.min_price.value
        const coefficient = (max_price - min_price) / exponent.value
        const start_u = Number(start_utilization.dividing(weight))
        const end_u = Number(end_utilization.dividing(weight))
        const delta =
            min_price * end_u -
            min_price * start_u +
            coefficient * Math.pow(end_u, exponent.value) -
            coefficient * Math.pow(start_u, exponent.value)
        return delta
    }

    price_integral_delta(start_utilization: Int64, end_utilization: Int64): number {
        const difference = Asset.fromUnits(
            this.max_price.units.subtracting(this.min_price.units),
            this.symbol
        )
        const coefficient = difference.value / this.exponent.value
        const start_u = Number(start_utilization.dividing(this.weight))
        const end_u = Number(end_utilization.dividing(this.weight))
        const delta =
            this.min_price.value * end_u -
            this.min_price.value * start_u +
            coefficient * Math.pow(end_u, this.exponent.value) -
            coefficient * Math.pow(start_u, this.exponent.value)
        return delta
    }

    // Mimic: https://github.com/EOSIO/eosio.contracts/blob/d7bc0a5cc8c0c2edd4dc61b0126517d0cb46fd94/contracts/eosio.system/src/powerup.cpp#L262-L315
    fee_legacy(utilization_increase, adjusted_utilization) {
        const {utilization, weight} = this

        let start_utilization = Int64.from(utilization)
        const end_utilization = start_utilization.adding(utilization_increase)

        let fee = 0
        if (start_utilization.lt(adjusted_utilization)) {
            const min = Math.min(
                utilization_increase,
                adjusted_utilization.subtracting(start_utilization)
            )
            fee += Number(
                intToBigDecimal(this.price_function_legacy(adjusted_utilization) * min)
                    .divide(intToBigDecimal(weight))
                    .getValue()
            )
            start_utilization = adjusted_utilization
        }
        if (start_utilization.lt(end_utilization)) {
            fee += this.price_integral_delta(start_utilization, end_utilization)
        }
        return fee
    }

    fee(utilization_increase: UInt128, adjusted_utilization: Int64) {
        const {utilization, weight} = this

        let start_utilization = Int64.from(utilization)
        const end_utilization = start_utilization.adding(utilization_increase)

        let fee = 0
        if (start_utilization.lt(adjusted_utilization)) {
            const min = Math.min(
                Number(utilization_increase),
                Number(adjusted_utilization.subtracting(start_utilization))
            )
            fee += Number(
                intToBigDecimal(this.price_function(adjusted_utilization) * min)
                    .divide(intToBigDecimal(weight))
                    .getValue()
            )

            start_utilization = adjusted_utilization
        }
        if (start_utilization.gt(end_utilization)) {
            fee += this.price_integral_delta(start_utilization, end_utilization)
        }
        return fee
    }

    // Mimic: https://github.com/EOSIO/eosio.contracts/blob/d7bc0a5cc8c0c2edd4dc61b0126517d0cb46fd94/contracts/eosio.system/src/powerup.cpp#L105-L117
    determine_adjusted_utilization(options?: PowerUpStateOptions) {
        // Casting EOSIO types to usable formats for JS calculations
        const {decay_secs, utilization, utilization_timestamp} = this
        let {adjusted_utilization} = this
        // If utilization is less than adjusted, calculate real time value
        if (utilization.lt(adjusted_utilization)) {
            // Create now & adjust JS timestamp to match EOSIO timestamp values
            const ts = options && options.timestamp ? options.timestamp : new Date()
            const now = TimePointSec.from(ts).toMilliseconds() / 1000
            const diff = adjusted_utilization.subtracting(utilization).toNumber()
            let delta: number =
                diff *
                Math.exp(-(now - utilization_timestamp.toMilliseconds()) / Number(decay_secs))
            delta = Math.min(Math.max(delta, 0), diff) // Clamp the delta
            adjusted_utilization = utilization.adding(delta)
        }
        return adjusted_utilization
    }
}
