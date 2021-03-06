import {
    Asset,
    AssetType,
    Float64,
    Int64,
    Struct,
    TimePointSec,
    TimePointType,
    UInt128,
    UInt32,
    UInt64,
    UInt8,
} from '@greymass/eosio'

import {BNPrecision, Resources, SampleUsage} from '.'

interface PowerUpStateOptions {
    // timestamp to base adjusted_utilization off
    timestamp?: TimePointType
    // blockchain resource limits for calculating usage
    virtual_block_cpu_limit?: UInt64
    virtual_block_net_limit?: UInt64
}

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
        return (
            min_price * end_u -
            min_price * start_u +
            coefficient * Math.pow(end_u, exponent) -
            coefficient * Math.pow(start_u, exponent)
        )
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

@Struct.type('powerupstateresourcenet')
export class PowerUpStateResourceNET extends PowerUpStateResource {
    per_day(options?: PowerUpStateOptions) {
        const limit =
            options && options.virtual_block_net_limit
                ? options.virtual_block_net_limit
                : this.default_block_net_limit
        return Number(limit) * 2 * 60 * 60 * 24
    }

    kb_per_day(options?: PowerUpStateOptions) {
        return this.per_day(options) / 1000
    }

    byte_to_weight(sample: UInt128, bytes: number): number {
        return Math.floor((bytes / Number(sample)) * BNPrecision)
    }

    frac(usage: SampleUsage, bytes: number) {
        const {weight} = this.cast()
        const frac = this.byte_to_weight(usage.net, bytes) / weight
        return Math.floor(frac * Math.pow(10, 15))
    }

    price_per_kb(usage: SampleUsage, bytes = 1, options?: PowerUpStateOptions): number {
        return this.price_per_byte(usage, bytes * 1000, options)
    }

    price_per_byte(usage: SampleUsage, bytes = 1000, options?: PowerUpStateOptions): number {
        // Determine the utilization increase by this action
        const utilization_increase = this.utilization_increase(usage.net, bytes)

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

@Struct.type('powerupstate')
export class PowerUpState extends Struct {
    @Struct.field('uint8') version!: UInt8
    @Struct.field(PowerUpStateResourceNET) net!: PowerUpStateResourceNET
    @Struct.field(PowerUpStateResourceCPU) cpu!: PowerUpStateResourceCPU
    @Struct.field('uint32') powerup_days!: UInt32
    @Struct.field('asset') min_powerup_fee!: Asset
}

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
}
