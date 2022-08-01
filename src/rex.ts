import {BNPrecision, Resources, SampleUsage} from './'

import {Asset, Struct, UInt64, UInt8} from '@greymass/eosio'

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
        const factor = 10 ** this.total_unlent.symbol.precision
        return (
            Number(
                this.total_lent.units
                    .adding(this.total_unlent.units)
                    .dividing(this.total_rex.units.dividing(factor))
            ) / factor
        )
    }

    exchange(amount: Asset): Asset {
        return Asset.from(
            (amount.value * this.total_lendable.value) / this.total_rex.value,
            this.symbol
        )
    }

    price_per(sample: SampleUsage, unit = 1000): number {
        // Sample token units
        const tokens = Asset.fromUnits(10000, this.symbol)

        // Spending 1 EOS (10000 units) on REX gives this many tokens
        const bancor = Number(tokens.units) / (this.total_rent.value / this.total_unlent.value)

        // The ratio of the number of tokens received vs the sampled values
        const unitPrice = bancor * (Number(sample.cpu) / BNPrecision)

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
