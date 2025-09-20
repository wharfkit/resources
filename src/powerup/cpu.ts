import {Asset, Int64, Int64Type, Struct, UInt128, UInt128Type} from '@wharfkit/antelope'

import {BNPrecision, intToBigDecimal, SampleUsage} from '..'
import {PowerUpStateResource} from './abstract'
import {PowerUpStateOptions} from './options'

@Struct.type('powerupstateresourcecpu')
export class PowerUpStateResourceCPU extends PowerUpStateResource {
    // Return smallest units per day, μs (microseconds)
    per_day = (options?: PowerUpStateOptions) => this.us_per_day(options)

    // Return ms (milliseconds) per day
    ms_per_day(options?: PowerUpStateOptions) {
        return this.us_per_day(options) / 1000
    }

    // Return μs (microseconds) per day
    us_per_day(options?: PowerUpStateOptions) {
        const limit =
            options && options.virtual_block_cpu_limit
                ? options.virtual_block_cpu_limit
                : this.default_block_cpu_limit
        return Number(limit) * 2 * 60 * 60 * 24
    }

    // Convert weight to μs (microseconds)
    weight_to_us(sample: UInt128Type, weight: Int64Type): UInt128 {
        return UInt128.from(
            UInt128.from(weight).multiplying(Int64.from(sample)).dividing(BNPrecision, 'ceil')
        )
    }

    // Convert μs (microseconds) to weight
    us_to_weight(sample: UInt128, us: Int64Type): Int64 {
        return Int64.from(us).multiplying(BNPrecision).dividing(sample, 'floor')
    }

    // Default frac generation by smallest unit type
    frac = (usage: SampleUsage, us: number) => this.frac_by_us(usage, us)

    // Frac generation by ms (milliseconds)
    frac_by_ms = (usage: SampleUsage, ms: number) => this.frac_by_us(usage, ms * 1000)

    // Frac generation by μs (microseconds)
    frac_by_us(usage: SampleUsage, us: Int64Type): Int64 {
        const precision = 15
        const converted = intToBigDecimal(this.us_to_weight(usage.cpu, us))
        const current = intToBigDecimal(this.weight)
        const multiplier = intToBigDecimal(Math.pow(10, precision))
        const frac = converted.divide(current, precision).multiply(multiplier)
        return Int64.from(frac.getValue())
    }

    // Price generation by smallest units, μs (microseconds)
    price_per = (usage: SampleUsage, us = 1000, options?: PowerUpStateOptions): number =>
        this.price_per_us(usage, us, options)

    // Price generation by ms (milliseconds)
    price_per_ms = (usage: SampleUsage, ms = 1, options?: PowerUpStateOptions): number =>
        this.price_per_us(usage, ms * 1000, options)

    // Price generation by μs (microseconds)
    price_per_us(usage: SampleUsage, us = 1000, options?: PowerUpStateOptions): number {
        // Determine the utilization increase by this action
        const frac = UInt128.from(this.frac(usage, us))
        const utilization_increase = this.utilization_increase(frac)
        // Determine the adjusted utilization if needed
        const adjusted_utilization = this.determine_adjusted_utilization(options)
        // Derive the fee from the increase and utilization
        const fee = this.fee(utilization_increase, adjusted_utilization)
        // Force the fee up to the next highest value of precision
        const precision = Math.pow(10, this.max_price.symbol.precision)
        const price = fee * precision
        const value = Math.ceil(price) / precision
        const asset = Asset.fromFloat(fee, this.symbol)
        if (price < 1) {
            throw new Error(
                `Price (${String(
                    asset
                )}) for requested CPU amount (${us}us) below required precision, increase requested amount.`
            )
        }
        if (options && options.min_payment && options.min_payment.units.gt(asset.units)) {
            throw new Error(
                `Price (${String(
                    asset
                )}) for requested CPU amount (${us}us) below minimum required payment (${String(
                    options.min_payment
                )}), increase requested CPU amount.`
            )
        }
        // Return the modified fee
        return value
    }
}
