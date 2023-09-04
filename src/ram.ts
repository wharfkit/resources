import {Resources} from './'

import {Asset, Float64, Int64, Struct} from '@wharfkit/antelope'

@Struct.type('connector')
export class Connector extends Struct {
    @Struct.field('asset') balance!: Asset
    @Struct.field('float64') weight!: Float64
}

@Struct.type('exchange_state')
export class ExchangeState extends Struct {
    @Struct.field('asset') supply!: Asset
    @Struct.field(Connector) base!: Connector
    @Struct.field(Connector) quote!: Connector
}

@Struct.type('ramstate')
export class RAMState extends ExchangeState {
    public price_per(bytes: number): Asset {
        const base = this.base.balance.units
        const quote = this.quote.balance.units
        return Asset.fromUnits(
            this.get_input(base, quote, Int64.from(bytes)),
            this.quote.balance.symbol
        )
    }

    public price_per_kb(kilobytes: number): Asset {
        return this.price_per(kilobytes * 1000)
    }

    // Derived from https://github.com/EOSIO/eosio.contracts/blob/f6578c45c83ec60826e6a1eeb9ee71de85abe976/contracts/eosio.system/src/exchange_state.cpp#L96
    public get_input(base: Int64, quote: Int64, value: Int64): Int64 {
        // (quote * value) / (base - value), using 'ceil' to round up
        return quote.multiplying(value).dividing(base.subtracting(value), 'ceil')
    }
}

export class RAMAPI {
    constructor(private parent: Resources) {}

    async get_state() {
        const response = await this.parent.api.v1.chain.get_table_rows({
            code: 'eosio',
            scope: 'eosio',
            table: 'rammarket',
            type: RAMState,
        })
        return response.rows[0]
    }
}
