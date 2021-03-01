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

    async get_reserved() {
        const state = await this.get_state()
        const {total_lent, total_lendable} = state
        return Number(total_lent.units) / Number(total_lendable.units)
    }

    async get_allocated() {
        const state = await this.parent.v1.powerup.get_state()
        const {weight_ratio} = state.cpu
        return Number(weight_ratio) / this.parent.rex_target_weight / 100
    }

    async get_price_per_ms(ms = 1): Promise<Asset> {
        const allocated = await this.get_allocated()
        const state = await this.get_state()
        const {cpu} = await this.parent.getSampledUsage()

        const totalRent = state.total_rent
        const totalUnlent = state.total_unlent
        const tokens = 1
        const msPerToken = (tokens / (totalRent.value / totalUnlent.value)) * cpu * allocated
        return Asset.from((tokens / msPerToken) * ms, this.parent.symbol)
    }
}
