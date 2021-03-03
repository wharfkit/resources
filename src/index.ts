import {API, APIClient, APIClientOptions, FetchProvider} from '@greymass/eosio'

import {PowerUpAPI} from './powerup'
import {REXAPI} from './rex'

export * from './powerup'
export * from './rex'

interface ResourcesOptions extends APIClientOptions {
    api?: APIClient
    symbol?: string
    url?: string
}

export interface SampleUsage {
    account: API.v1.AccountObject
    cpu: number
    net: number
}

export class Resources {
    static __className = 'Resources'

    readonly api: APIClient

    // the account to use when sampling usage for REX
    sampleAccount = 'b1'

    // token precision/symbol
    symbol = '4,EOS'

    constructor(options: ResourcesOptions) {
        if (options.api) {
            this.api = options.api
        } else if (options.url) {
            this.api = new APIClient({provider: new FetchProvider(options.url, options)})
        } else {
            throw new Error('Missing url or api client')
        }
    }

    v1 = {
        powerup: new PowerUpAPI(this),
        rex: new REXAPI(this),
    }

    async getSampledUsage(): Promise<SampleUsage> {
        const account = await this.api.v1.chain.get_account(this.sampleAccount)
        return {
            account,
            cpu: Number(account.cpu_limit.max.value) / Number(account.cpu_weight.value),
            net: Number(account.net_limit.max.value) / Number(account.net_weight.value),
        }
    }
}
