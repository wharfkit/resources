import 'mocha'
import {strict as assert} from 'assert'
import {join as joinPath} from 'path'

import {APIClient, Asset} from '@greymass/eosio'
import {MockProvider} from './utils/mock-provider'

import {Resources, REXState} from '../src'

const eos = new APIClient({
    provider: new MockProvider(joinPath(__dirname, 'data'), 'https://eos.greymass.com'),
})

const resources = new Resources({api: eos})

suite('[eos] rex calculations', function () {
    this.slow(200)
    test('v1.rex.get_state', async function () {
        const rex = await resources.v1.rex.get_state()
        assert.equal(rex instanceof REXState, true)
    })
    test('rex.reserved', async function () {
        const rex = await resources.v1.rex.get_state()
        assert.equal(rex.reserved, 0.6245244254669211)
        // 62.45244254669211% represented as float
    })
    test('rex.price_per(1000)', async function () {
        const rex = await resources.v1.rex.get_state()
        const usage = await resources.getSampledUsage()
        const price = rex.price_per(usage, 1000)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.0165 EOS')
        assert.equal(asset.value, 0.0165)
        assert.equal(Number(asset.units), 165)
    })
    test('rex.price_per(10000)', async function () {
        const rex = await resources.v1.rex.get_state()
        const usage = await resources.getSampledUsage()
        const price = rex.price_per(usage, 10000)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.1655 EOS')
        assert.equal(asset.value, 0.1655)
        assert.equal(Number(asset.units), 1655)
    })
    test('rex.price_per(1000000)', async function () {
        const rex = await resources.v1.rex.get_state()
        const usage = await resources.getSampledUsage()
        const price = rex.price_per(usage, 1000000)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '16.5478 EOS')
        assert.equal(asset.value, 16.5478)
        assert.equal(Number(asset.units), 165478)
    })
})
