import {Asset} from '@greymass/eosio'

import {Resources, SampleUsage} from './'
import {REXState} from './abi-types'

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

    get_reserved(state: REXState) {
        const {total_lent, total_lendable} = state
        return Number(total_lent.units) / Number(total_lendable.units)
    }

    get_price_per_ms(state: REXState, usage: SampleUsage, ms = 1): Asset {
        // REX Values
        const {total_rent, total_unlent} = state

        // Sample token units
        const tokens = Asset.fromUnits(10000, this.parent.symbol)

        // Spending 1 EOS (10000 units) on REX gives this many tokens
        const bancor = Number(tokens.units) / (total_rent.value / total_unlent.value)

        // The ratio of the number of tokens received vs the sampled cpu values
        const microseconds = bancor * usage.cpu

        // The token units spent per microsecond
        const permicrosecond = Number(tokens.units) / microseconds

        // Converting to milliseconds
        const permillisecond = permicrosecond * 1000

        // Multiply the per millisecond cost by the ms requested
        const cost = permillisecond * ms

        // Converting to an Asset
        return Asset.fromUnits(cost, this.parent.symbol)
    }
}
