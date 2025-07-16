import {BNPrecision, intToBigDecimal, Resources, SampleUsage} from './'

import {Asset, Struct, UInt128, UInt64, UInt8} from '@wharfkit/antelope'

@Struct.type('rexstate')
export class REXState extends Struct {
    @Struct.field('uint8') version!: UInt8
    @Struct.field('asset') total_lent!: Asset
    @Struct.field('asset') total_unlent!: Asset
    @Struct.field('asset') total_rent!: Asset
    @Struct.field('asset') total_lendable!: Asset
    @Struct.field('asset') total_rex!: Asset
    @Struct.field('asset') namebid_proceeds!: Asset
    @Struct.field('uint64') loan_num!: UInt64

    public get reserved() {
        return Number(this.total_lent.units) / Number(this.total_lendable.units)
    }

    public get symbol() {
        return this.total_lent.symbol
    }

    public get precision() {
        return this.total_lent.symbol.precision
    }

    public get value() {
        const lent = intToBigDecimal(this.total_lent.units)
        const unlent = intToBigDecimal(this.total_unlent.units)
        const rex = intToBigDecimal(this.total_rex.units)
        return Number(lent.add(unlent).divide(rex, 18).getValue())
    }

    exchange(amount: Asset): Asset {
        const value = intToBigDecimal(amount.units)
        const lendable = intToBigDecimal(this.total_lendable.units)
        const rex = intToBigDecimal(this.total_rex.units)
        const tokens = value.multiply(lendable).divide(rex, this.precision)
        return Asset.fromUnits(Number(tokens.getValue()), this.symbol)
    }

    cpu_price_per_ms(sample: SampleUsage, ms = 1): number {
        return this.cpu_price_per_us(sample, ms * 1000)
    }

    cpu_price_per_us(sample: SampleUsage, us = 1000): number {
        return this.price_per(sample, us, sample.cpu)
    }

    net_price_per_kb(sample: SampleUsage, kilobytes = 1): number {
        return this.net_price_per_byte(sample, kilobytes * 1000)
    }

    net_price_per_byte(sample: SampleUsage, bytes = 1000): number {
        return this.price_per(sample, bytes, sample.net)
    }

    price_per(sample: SampleUsage, unit = 1000, usage: UInt128 = sample.cpu): number {
        // Sample token units
        const tokens = Asset.fromUnits(10000, this.symbol)

        // Spending 1 EOS (10000 units) on REX gives this many tokens
        const bancor = Number(tokens.units) / (this.total_rent.value / this.total_unlent.value)

        // The ratio of the number of tokens received vs the sampled values
        const unitPrice = bancor * (Number(usage) / BNPrecision)

        // The token units spent per unit
        const perunit = Number(tokens.units) / unitPrice

        // Multiply the per unit cost by the units requested
        const cost = perunit * unit

        // Converting to an Asset
        return cost / Math.pow(10, this.precision)
    }
}

export class REXAPI {
    constructor(private parent: Resources) {}

    async get_state() {
        const response = await this.parent.api.v1.chain.get_table_rows({
            code: 'eosio',
            scope: 'eosio',
            table: 'rexpool',
            type: REXState,
        })
        return response.rows[0]
    }
}
