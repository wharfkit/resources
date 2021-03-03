import {Resources, SampleUsage} from './'

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

    price_per_ms(usage: SampleUsage, ms = 1): number {
        return this.price_per_us(usage, ms * 1000)
    }

    price_per_us(usage: SampleUsage, us = 1000): number {
        // Sample token units
        const tokens = Asset.fromUnits(10000, this.symbol)

        // Spending 1 EOS (10000 units) on REX gives this many tokens
        const bancor = Number(tokens.units) / (this.total_rent.value / this.total_unlent.value)

        // The ratio of the number of tokens received vs the sampled cpu values
        const microseconds = bancor * usage.cpu

        // The token units spent per microsecond
        const permicrosecond = Number(tokens.units) / microseconds

        // Multiply the per microsecond cost by the us requested
        const cost = permicrosecond * us

        // Converting to an Asset
        return cost
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
