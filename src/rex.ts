import {Asset} from '@greymass/eosio'

import {Resources} from './'
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

    async get_reserved(state: REXState) {
        const {total_lent, total_lendable} = state
        return Number(total_lent.units) / Number(total_lendable.units)
    }

    async get_price_per_ms(state: REXState, ms = 1): Promise<Asset> {
        // REX Values
        const {total_rent, total_unlent} = state

        // Sample CPU usage
        const {cpu} = await this.parent.getSampledUsage()

        const totalRent = state.total_rent
        const totalUnlent = state.total_unlent
        const tokens = 1
        const msPerToken = (tokens / (totalRent.value / totalUnlent.value)) * cpu * allocated
        return Asset.from((tokens / msPerToken) * ms, this.parent.symbol)
    }
}
