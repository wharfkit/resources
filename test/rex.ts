import 'mocha'
import {strict as assert} from 'assert'

import {Asset} from '@wharfkit/antelope'

import {Resources, REXState} from '../src'
import {makeClient} from '@wharfkit/mock-data'

const resources = new Resources({api: makeClient('https://eos.greymass.com')})

suite('[eos] rex calculations', function () {
    this.slow(200)
    test('v1.rex.get_state', async function () {
        const rex = await resources.v1.rex.get_state()
        assert.equal(rex instanceof REXState, true)
    })
    test('rex.reserved', async function () {
        const rex = await resources.v1.rex.get_state()
        assert.equal(rex.reserved, 0.04960045779382111)
        // 04.960045779382111% represented as float
    })
    test('rex.value', async function () {
        const rex = await resources.v1.rex.get_state()
        assert.equal(rex.value, 0.00010160262316038182)
        // 0.00010160262316038182 EOS/REX
    })
    test('rex.exchange', async function () {
        const rex = await resources.v1.rex.get_state()
        const amount = Asset.from('493874015.6505 REX')
        const tokens = rex.exchange(amount)
        assert.equal(tokens.value, 50178.8955)
    })
    test('rex.price_per(1000)', async function () {
        const rex = await resources.v1.rex.get_state()
        const usage = await resources.getSampledUsage()
        const price = rex.price_per(usage, 1000)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.0671 EOS')
        assert.equal(asset.value, 0.0671)
        assert.equal(Number(asset.units), 671)
    })
    test('rex.price_per(10000)', async function () {
        const rex = await resources.v1.rex.get_state()
        const usage = await resources.getSampledUsage()
        const price = rex.price_per(usage, 10000)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.6709 EOS')
        assert.equal(asset.value, 0.6709)
        assert.equal(Number(asset.units), 6709)
    })
    test('rex.price_per(1000000)', async function () {
        const rex = await resources.v1.rex.get_state()
        const usage = await resources.getSampledUsage()
        const price = rex.price_per(usage, 1000000)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '67.0870 EOS')
        assert.equal(asset.value, 67.087)
        assert.equal(Number(asset.units), 670870)
    })
})
