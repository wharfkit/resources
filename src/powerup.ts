import {
    Asset,
    AssetType,
    Float64,
    Int64,
    Struct,
    TimePointSec,
    UInt32,
    UInt64,
    UInt8,
} from '@greymass/eosio'
import {Resources} from '.'

@Struct.type('powerupstateresource')
export class PowerUpStateResource extends Struct {
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

    // TODO: Get these loaded from a get_info call
    public virtual_block_cpu_limit: UInt64 = UInt64.from(200000)
    public virtual_block_net_limit: UInt64 = UInt64.from(1048576000)

    // Ability to set the current time, primarily for unit tests
    public now: number | undefined = undefined

    public get us_per_day() {
        return Number(this.virtual_block_cpu_limit) * 2 * 60 * 60 * 24
    }

    public get ms_per_day() {
        return (Number(this.virtual_block_cpu_limit) / 1000) * 2 * 60 * 60 * 24
    }

    public get allocated() {
        return 1 - Number(this.weight_ratio) / Number(this.target_weight_ratio) / 100
    }

    public get reserved() {
        return Number(this.utilization) / Number(this.weight)
    }

    public get symbol() {
        return this.min_price.symbol
    }

    frac(value: AssetType) {
        const asset = Asset.from(value)
        const price = this.price_per_us(1)
        const allocated = this.allocated
        const us_available = Math.floor(this.us_per_day * allocated)
        const us_to_rent = Math.floor(asset.value / price)
        const frac = (us_to_rent / us_available) * Math.pow(10, 15)
        return Math.floor(frac)
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

    utilization_increase(amount) {
        // Resources allocated to PowerUp
        const allocated = this.allocated
        const {weight} = this.cast()

        // Microseconds available per day available in PowerUp (factoring in shift)
        const us_available = this.us_per_day * allocated

        // Percentage to rent
        const percentToRent = amount / us_available
        return weight * percentToRent
    }

    private price_function(utilization: number): number {
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

    private price_integral_delta(start_utilization: number, end_utilization: number): number {
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

    private fee(utilization_increase, adjusted_utilization) {
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

    determine_adjusted_utilization() {
        // Casting EOSIO types to usable formats for JS calculations
        const {decay_secs, utilization, utilization_timestamp} = this.cast()
        let {adjusted_utilization} = this.cast()
        // If utilization is less than adjusted, calculate real time value
        if (utilization < adjusted_utilization) {
            // Allow overriding of the current timestamp for unit tests
            const date = this.now ? this.now : Date.now()
            // Create now & adjust JS timestamp to match EOSIO timestamp values
            const now: number = Math.floor(date / 1000)
            const diff: number = adjusted_utilization - utilization
            let delta: number = Math.floor(
                diff * Math.exp(-(now - utilization_timestamp) / decay_secs)
            )
            delta = Math.min(Math.max(delta, 0), diff) // Clamp the delta
            adjusted_utilization = utilization + delta
        }
        return adjusted_utilization
    }

    price_per_ms(ms = 1): number {
        return this.price_per_us(ms * 1000)
    }

    price_per_us(us = 1000): number {
        // Determine the utilization increase by this action
        const utilization_increase = this.utilization_increase(us)

        // Determine the adjusted utilization if needed
        const adjusted_utilization = this.determine_adjusted_utilization()

        // Derive the fee from the increase and utilization
        const fee = this.fee(utilization_increase, adjusted_utilization)
        // Return the asset version of the fee
        return fee
    }
}

@Struct.type('powerupstate')
export class PowerUpState extends Struct {
    @Struct.field('uint8') version!: UInt8
    @Struct.field(PowerUpStateResource) net!: PowerUpStateResource
    @Struct.field(PowerUpStateResource) cpu!: PowerUpStateResource
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
