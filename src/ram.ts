import {Resources} from './'

import {Asset, Float64, Struct} from '@greymass/eosio'

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
    public price_per(bytes: number): number {
        const base = this.base.balance.units.toNumber()
        const quote = this.quote.balance.value
        return this.get_input(base, quote, bytes)
    }

    public price_per_kb(kb: number): number {
        return this.price_per(kb * 1000)
    }

    // Derived from https://github.com/EOSIO/eosio.contracts/blob/f6578c45c83ec60826e6a1eeb9ee71de85abe976/contracts/eosio.system/src/exchange_state.cpp#L96
    public get_input(base: number, quote: number, value: number): number {
        const result = (quote * value) / (base - value)
        if (result < 0) {
            return 0
        }
        return result
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
