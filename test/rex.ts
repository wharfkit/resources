import 'mocha'
import {strict as assert} from 'assert'
import {join as joinPath} from 'path'

import {APIClient, Name} from '@greymass/eosio'
import {MockProvider} from './utils/mock-provider'

import {Resources} from '../src'
import * as ABIs from '../src/abi-types'

const eos = new APIClient({
    provider: new MockProvider(joinPath(__dirname, 'data'), 'https://eos.greymass.com'),
})

const resources = new Resources({api: eos})

suite('rex', function () {
    this.slow(200)
    test('v1.rex.get_state', async function () {
        const state = await resources.v1.rex.get_state()
        assert.equal(state instanceof ABIs.REXState, true)
    })
    test('v1.rex.get_allocated', async function () {
        const cpu = await resources.v1.rex.get_allocated()
        // 0.872042702215582% represented as float
        assert.equal(cpu, 0.870903026075642)
    })
    test('v1.rex.get_reserved', async function () {
        const reserved = await resources.v1.rex.get_reserved()
        // 55.66151698897704% represented as float
        assert.equal(reserved, 0.5565968415413414)
    })
    test('v1.rex.get_price_per_ms(1)', async function () {
        const price = await resources.v1.rex.get_price_per_ms()
        assert.equal(String(price), '0.0042 EOS')
        assert.equal(price.value, 0.0042)
        assert.equal(Number(price.units), 42)
    })
    test('v1.rex.get_price_per_ms(1000)', async function () {
        const price = await resources.v1.rex.get_price_per_ms(1000)
        assert.equal(String(price), '4.2269 EOS')
        assert.equal(price.value, 4.2269)
        assert.equal(Number(price.units), 42269)
    })
})
