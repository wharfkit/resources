import 'mocha'
import {strict as assert} from 'assert'
import {join as joinPath} from 'path'

import {APIClient} from '@greymass/eosio'
import {MockProvider} from './utils/mock-provider'

import {RAMState, Resources} from '../src'

const eos = new APIClient({
    provider: new MockProvider(joinPath(__dirname, 'data'), 'https://eos.greymass.com'),
})

const resources = new Resources({api: eos})

suite('[eos] ram calculations', function () {
    this.slow(200)
    test('v1.ram.get_state', async function () {
        const ram = await resources.v1.ram.get_state()
        assert.equal(ram instanceof RAMState, true)
    })
    test('ram.price_per(100)', async function () {
        const ram = await resources.v1.ram.get_state()
        assert.equal(ram.price_per(100), 0.0029972483286048305)
    })
    test('ram.price_per(100000)', async function () {
        const ram = await resources.v1.ram.get_state()
        assert.equal(ram.price_per(100000), 2.997249892194665)
    })
    test('ram.price_per_kb(1)', async function () {
        const ram = await resources.v1.ram.get_state()
        const control = ram.price_per(1000)
        const actual = ram.price_per_kb(1)
        assert.equal(control, 0.029972483426912184)
        assert.equal(actual, 0.029972483426912184)
        assert.equal(actual, control)
    })
})
