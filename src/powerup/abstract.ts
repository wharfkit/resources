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
} from '@greymass/eosio'

import {BNPrecision} from '..'
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

    public get allocated() {
        return 1 - Number(this.weight_ratio) / Number(this.target_weight_ratio) / 100
    }

    public get reserved() {
        return Number(this.utilization) / Number(this.weight)
    }

    public get symbol() {
        return this.min_price.symbol
    }

    cast() {
        return {
            adjusted_utilization: Number(this.adjusted_utilization),
            decay_secs: Number(this.decay_secs.value),
            exponent: Number(this.exponent),
            utilization: Number(this.utilization),
            utilization_timestamp: Number(this.utilization_timestamp.value),
            weight: Number(this.weight),
            weight_ratio: Number(this.weight_ratio),
        }
    }

    utilization_increase(sample: UInt128, amount) {
        const weight_per_unit = 1 / (Number(sample) / BNPrecision)
        const weight_required = amount * weight_per_unit
        return Math.floor(weight_required)
    }

    price_function(utilization: number): number {
        const {exponent, weight} = this.cast()
        const max_price: number = this.max_price.value
        const min_price: number = this.min_price.value
        let price = min_price
        const new_exponent = exponent - 1.0
        if (new_exponent <= 0.0) {
            return max_price
        } else {
            price += (max_price - min_price) * Math.pow(utilization / weight, new_exponent)
        }
        return price
    }

    price_integral_delta(start_utilization: number, end_utilization: number): number {
        const {exponent, weight} = this.cast()
        const max_price: number = this.max_price.value
        const min_price: number = this.min_price.value
        const coefficient = (max_price - min_price) / exponent
        const start_u = start_utilization / weight
        const end_u = end_utilization / weight
        const delta =
            min_price * end_u -
            min_price * start_u +
            coefficient * Math.pow(end_u, exponent) -
            coefficient * Math.pow(start_u, exponent)
        return delta
    }

    fee(utilization_increase, adjusted_utilization) {
        const {utilization, weight} = this.cast()
        let start_utilization: number = utilization
        const end_utilization: number = start_utilization + utilization_increase
        let fee = 0
        if (start_utilization < adjusted_utilization) {
            fee +=
                (this.price_function(adjusted_utilization) *
                    Math.min(utilization_increase, adjusted_utilization - start_utilization)) /
                weight
            start_utilization = adjusted_utilization
        }

        if (start_utilization < end_utilization) {
            fee += this.price_integral_delta(start_utilization, end_utilization)
        }
        return fee
    }

    determine_adjusted_utilization(options?: PowerUpStateOptions) {
        // Casting EOSIO types to usable formats for JS calculations
        const {decay_secs, utilization, utilization_timestamp} = this.cast()
        let {adjusted_utilization} = this.cast()
        // If utilization is less than adjusted, calculate real time value
        if (utilization < adjusted_utilization) {
            // Create now & adjust JS timestamp to match EOSIO timestamp values
            const ts = options && options.timestamp ? options.timestamp : new Date()
            const now = TimePointSec.from(ts).toMilliseconds() / 1000
            const diff: number = adjusted_utilization - utilization
            let delta: number = diff * Math.exp(-(now - utilization_timestamp) / decay_secs)
            delta = Math.min(Math.max(delta, 0), diff) // Clamp the delta
            adjusted_utilization = utilization + delta
        }
        return adjusted_utilization
    }
}
