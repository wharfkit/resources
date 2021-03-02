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
    test('v1.rex.get_reserved', async function () {
        const state = await resources.v1.rex.get_state()
        const reserved = await resources.v1.rex.get_reserved(state)
        // 55.66151698897704% represented as float
        assert.equal(reserved, 0.5565968415413414)
    })
    test('v1.rex.get_price_per_ms(1)', async function () {
        const state = await resources.v1.rex.get_state()
        const price = await resources.v1.rex.get_price_per_ms(state)
        assert.equal(String(price), '0.0037 EOS')
        assert.equal(price.value, 0.0037)
        assert.equal(Number(price.units), 37)
    })
    test('v1.rex.get_price_per_ms(10)', async function () {
        const state = await resources.v1.rex.get_state()
        const price = await resources.v1.rex.get_price_per_ms(state, 10)
        assert.equal(String(price), '0.0370 EOS')
        assert.equal(price.value, 0.037)
        assert.equal(Number(price.units), 370)
    })
    test('v1.rex.get_price_per_ms(1000)', async function () {
        const state = await resources.v1.rex.get_state()
        const price = await resources.v1.rex.get_price_per_ms(state, 1000)
        assert.equal(String(price), '3.7010 EOS')
        assert.equal(price.value, 3.701)
        assert.equal(Number(price.units), 37010)
    })
})
