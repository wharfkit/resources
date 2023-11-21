import {Struct, UInt128} from '@wharfkit/antelope'

import {BNPrecision, SampleUsage} from '..'
import {PowerUpStateResource} from './abstract'
import {PowerUpStateOptions} from './options'

@Struct.type('powerupstateresourcenet')
export class PowerUpStateResourceNET extends PowerUpStateResource {
    // Return smallest units per day, bytes
    per_day = (options?: PowerUpStateOptions) => this.bytes_per_day(options)

    // Return kb per day
    kb_per_day(options?: PowerUpStateOptions) {
        return this.bytes_per_day(options) / 1000
    }

    // Return bytes per day
    bytes_per_day(options?: PowerUpStateOptions) {
        const limit =
            options && options.virtual_block_net_limit
                ? options.virtual_block_net_limit
                : this.default_block_net_limit
        return Number(limit) * 2 * 60 * 60 * 24
    }

    // Convert weight to bytes
    weight_to_bytes(sample: UInt128, weight: number): number {
        return Math.ceil((weight * Number(sample)) / BNPrecision)
    }

    // Convert bytes to weight
    bytes_to_weight(sample: UInt128, bytes: number): number {
        return Math.floor((bytes / Number(sample)) * BNPrecision)
    }

    // Default frac generation by smallest unit type
    frac = (usage: SampleUsage, bytes: number) => this.frac_by_bytes(usage, bytes)

    // Frac generation by kb
    frac_by_kb = (usage: SampleUsage, kilobytes: number) =>
        this.frac_by_bytes(usage, kilobytes * 1000)

    // Frac generation by bytes
    frac_by_bytes(usage: SampleUsage, bytes: number) {
        const {weight} = this.cast()
        const frac = this.bytes_to_weight(usage.net, bytes) / weight
        return Math.floor(frac * Math.pow(10, 15))
    }

    // Price generation by smallest units, bytes
    price_per = (usage: SampleUsage, bytes = 1000, options?: PowerUpStateOptions) =>
        this.price_per_byte(usage, bytes, options)

    // Price generation by kb
    price_per_kb = (usage: SampleUsage, kilobytes = 1, options?: PowerUpStateOptions): number =>
        this.price_per_byte(usage, kilobytes * 1000, options)

    // Price generation by bytes
    price_per_byte(usage: SampleUsage, bytes = 1000, options?: PowerUpStateOptions): number {
        // Determine the utilization increase by this action
        const frac = UInt128.from(this.frac(usage, bytes))
        const utilization_increase = this.utilization_increase(usage.net, frac)

        // Determine the adjusted utilization if needed
        const adjusted_utilization = this.determine_adjusted_utilization(options)

        // Derive the fee from the increase and utilization
        const fee = this.fee(utilization_increase, adjusted_utilization)

        // Force the fee up to the next highest value of precision
        const precision = Math.pow(10, this.max_price.symbol.precision)
        const value = Math.ceil(fee * precision) / precision

        // Return the modified fee
        return value
    }
}
