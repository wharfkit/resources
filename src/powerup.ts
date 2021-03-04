import {
    Asset,
    AssetType,
    Float64,
    Int64,
    Struct,
    TimePointSec,
    TimePointType,
    UInt32,
    UInt64,
    UInt8,
} from '@greymass/eosio'
import {Resources} from '.'

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
        }
    }

    utilization_increase(amount, options?: PowerUpStateOptions) {
        // Resources allocated to PowerUp
        const allocated = this.allocated
        const {weight} = this.cast()

        // Microseconds available per day available in PowerUp (factoring in shift)
        const available = this.per_day(options) * allocated

        // Percentage to rent
        const percentToRent = amount / available
        return weight * percentToRent
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

    frac(value: AssetType, options?: PowerUpStateOptions) {
        const asset = Asset.from(value)
        const price = this.price_per_byte(1, options)
        const allocated = this.allocated
        const available = this.per_day(options) * allocated
        const to_rent = asset.value / price
        const frac = (to_rent / available) * Math.pow(10, 15)
        return Math.floor(frac)
    }

    price_per_kb(bytes = 1, options?: PowerUpStateOptions): number {
        return this.price_per_byte(bytes * 1000, options)
    }

    price_per_byte(bytes = 1000, options?: PowerUpStateOptions): number {
        // Determine the utilization increase by this action
        const utilization_increase = this.utilization_increase(bytes, options)

        // Determine the adjusted utilization if needed
        const adjusted_utilization = this.determine_adjusted_utilization(options)

        // Derive the fee from the increase and utilization
        const fee = this.fee(utilization_increase, adjusted_utilization)

        // Return the asset version of the fee
        return fee
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

    frac(value: AssetType, options?: PowerUpStateOptions) {
        const asset = Asset.from(value)
        const price = this.price_per_us(1, options)
        const allocated = this.allocated
        const available = this.per_day(options) * allocated
        const to_rent = asset.value / price
        const frac = (to_rent / available) * Math.pow(10, 15)
        return Math.floor(frac)
    }

    price_per_ms(ms = 1, options?: PowerUpStateOptions): number {
        return this.price_per_us(ms * 1000, options)
    }

    price_per_us(us = 1000, options?: PowerUpStateOptions): number {
        // Determine the utilization increase by this action
        const utilization_increase = this.utilization_increase(us, options)

        // Determine the adjusted utilization if needed
        const adjusted_utilization = this.determine_adjusted_utilization(options)

        // Derive the fee from the increase and utilization
        const fee = this.fee(utilization_increase, adjusted_utilization)

        // Return the asset version of the fee
        return fee
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
