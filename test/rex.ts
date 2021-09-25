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
        assert.equal(rex.reserved, 0.14616051141573932)
        // 14.616051141573932% represented as float
    })
    test('rex.value', async function () {
        const rex = await resources.v1.rex.get_state()
        assert.equal(rex.value, 0.0001)
        // 0.0001 EOS/REX
    })
    test('rex.price_per(1000)', async function () {
        const rex = await resources.v1.rex.get_state()
        const usage = await resources.getSampledUsage()
        const price = rex.price_per(usage, 1000)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.0910 EOS')
        assert.equal(asset.value, 0.091)
        assert.equal(Number(asset.units), 910)
    })
    test('rex.price_per(10000)', async function () {
        const rex = await resources.v1.rex.get_state()
        const usage = await resources.getSampledUsage()
        const price = rex.price_per(usage, 10000)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.9098 EOS')
        assert.equal(asset.value, 0.9098)
        assert.equal(Number(asset.units), 9098)
    })
    test('rex.price_per(1000000)', async function () {
        const rex = await resources.v1.rex.get_state()
        const usage = await resources.getSampledUsage()
        const price = rex.price_per(usage, 1000000)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '90.9765 EOS')
        assert.equal(asset.value, 90.9765)
        assert.equal(Number(asset.units), 909765)
    })
})
