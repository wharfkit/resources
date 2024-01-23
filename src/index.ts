import {API, APIClient, APIClientOptions, FetchProvider, UInt128} from '@wharfkit/antelope'
import BN from 'bn.js'

import {PowerUpAPI} from './powerup'
import {RAMAPI} from './ram'
import {REXAPI} from './rex'

export * from './powerup'
export * from './ram'
export * from './rex'

interface ResourcesOptions extends APIClientOptions {
    api?: APIClient
    sampleAccount?: string
    symbol?: string
    url?: string
}

export interface SampleUsage {
    account: API.v1.AccountObject
    cpu: UInt128
    net: UInt128
}

export const BNPrecision = new BN(100 * 1000 * 1000)

export class Resources {
    static __className = 'Resources'

    readonly api: APIClient

    // the account to use when sampling usage
    sampleAccount = 'b1'

    // token precision/symbol
    symbol = '4,EOS'

    constructor(options: ResourcesOptions) {
        // Allow overriding of the sample account name
        if (options.sampleAccount) {
            this.sampleAccount = options.sampleAccount
        }
        // Allow overriding of the system token symbol
        if (options.symbol) {
            this.symbol = options.symbol
        }
        // Allow variations on how to specify the API configuration
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
        ram: new RAMAPI(this),
        rex: new REXAPI(this),
    }

    async getSampledUsage(): Promise<SampleUsage> {
        const account = await this.api.v1.chain.get_account(this.sampleAccount)
        const us = UInt128.from(account.cpu_limit.max.value.mul(BNPrecision))
        const byte = UInt128.from(account.net_limit.max.value.mul(BNPrecision))

        const cpu_weight = UInt128.from(account.cpu_weight.value)
        const net_weight = UInt128.from(account.net_weight.value)

        return {
            account,
            cpu: divCeil(us.value, cpu_weight.value),
            net: divCeil(byte.value, net_weight.value),
        }
    }
}

function divCeil(num: BN, den: BN): UInt128 {
    let v: BN = num.div(den)
    const zero = new BN(0)
    const one = new BN(1)
    if (num.mod(den).gt(zero)) {
        v = v.sub(one)
    }
    return UInt128.from(v)
}
