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
import {PowerUpStateOptions} from './options'
import bigDecimal from 'js-big-decimal'

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
    public get allocated() {
        return 1 - Number(this.weight_ratio) / Number(this.target_weight_ratio) / 100
    }

    // Get the current percentage of reserved units
    public get reserved() {
        return new BN(String(this.utilization)) / new BN(String(this.weight))
    }

    // Get the symbol definition for the token
    public get symbol() {
        return this.min_price.symbol
    }

    // Common casting for typed values to numbers
    cast() {
        return {
            adjusted_utilization: String(this.adjusted_utilization),
            decay_secs: Number(this.decay_secs.value),
            exponent: Number(this.exponent),
            utilization: String(this.utilization),
            utilization_timestamp: Number(this.utilization_timestamp.value),
            weight: new BN(String(this.weight)),
            weight_ratio: Number(this.weight_ratio),
        }
    }

    // Mimic: https://github.com/EOSIO/eosio.contracts/blob/d7bc0a5cc8c0c2edd4dc61b0126517d0cb46fd94/contracts/eosio.system/src/powerup.cpp#L358
    utilization_increase(sample: UInt128, frac) {
        const {weight} = this
        const frac128 = UInt128.from(frac)
        const utilization_increase =
            new BN(weight.value.mul(new BN(frac128.value))) / Math.pow(10, 15)
        return Math.ceil(utilization_increase)
    }

    // Mimic: https://github.com/EOSIO/eosio.contracts/blob/d7bc0a5cc8c0c2edd4dc61b0126517d0cb46fd94/contracts/eosio.system/src/powerup.cpp#L284-L298
    price_function(utilization: number): number {
        const {exponent, weight} = this.cast()
        const max_price: number = this.max_price.value
        const min_price: number = this.min_price.value
        let price = min_price
        const new_exponent = exponent - 1.0
        if (new_exponent <= 0.0) {
            return max_price
        } else {
            const util_weight = new BN(utilization) / weight
            price += (max_price - min_price) * Math.pow(util_weight, new_exponent)
        }
        return price
    }

    // Mimic: https://github.com/EOSIO/eosio.contracts/blob/d7bc0a5cc8c0c2edd4dc61b0126517d0cb46fd94/contracts/eosio.system/src/powerup.cpp#L274-L280
    price_integral_delta(start_utilization: Int64, end_utilization: Int64): number {
        const {exponent, weight} = this.cast()
        const max_price: number = this.max_price.value
        const min_price: number = this.min_price.value
        const coefficient = (max_price - min_price) / exponent
        const start_u = Number(start_utilization.dividing(weight))
        const end_u = Number(end_utilization.dividing(weight))
        const delta =
            min_price * end_u -
            min_price * start_u +
            coefficient * Math.pow(end_u, exponent) -
            coefficient * Math.pow(start_u, exponent)
        return delta
    }

    // Mimic: https://github.com/EOSIO/eosio.contracts/blob/d7bc0a5cc8c0c2edd4dc61b0126517d0cb46fd94/contracts/eosio.system/src/powerup.cpp#L262-L315
    fee(utilization_increase, adjusted_utilization) {
        const {weight} = this.cast()
        const {utilization} = this

        let start_utilization = Int64.from(utilization)
        const end_utilization = start_utilization.adding(utilization_increase)

        let fee = 0
        if (start_utilization < adjusted_utilization) {
            const min = Math.min(
                utilization_increase,
                adjusted_utilization.subtracting(start_utilization)
            )
            fee += Number(
                new bigDecimal(this.price_function(adjusted_utilization) * min)
                    .divide(new bigDecimal(weight.toString()))
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
        const {decay_secs, utilization_timestamp} = this.cast()
        const {utilization} = this
        let {adjusted_utilization} = this
        // If utilization is less than adjusted, calculate real time value
        if (utilization.lt(adjusted_utilization)) {
            // Create now & adjust JS timestamp to match EOSIO timestamp values
            const ts = options && options.timestamp ? options.timestamp : new Date()
            const now = TimePointSec.from(ts).toMilliseconds() / 1000
            const diff = adjusted_utilization.subtracting(utilization).toNumber()
            let delta: number = diff * Math.exp(-(now - utilization_timestamp) / decay_secs)
            delta = Math.min(Math.max(delta, 0), diff) // Clamp the delta
            adjusted_utilization = utilization.adding(delta)
        }
        return adjusted_utilization
    }
}
