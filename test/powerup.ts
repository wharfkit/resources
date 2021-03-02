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

suite('powerup', function () {
    this.slow(200)
    test('v1.powerup.get_state', async function () {
        const state = await resources.v1.powerup.get_state()
        assert.equal(state instanceof ABIs.PowerUpState, true)
    })
    test('v1.powerup.get_allocated', async function () {
        const state = await resources.v1.powerup.get_state()
        const cpu = await resources.v1.powerup.get_allocated(state)
        // 12.7957297784418% represented as float
        assert.equal(cpu, 0.12909697392435804)
    })
    test('v1.powerup.get_reserved(cpu)', async function () {
        const state = await resources.v1.powerup.get_state()
        const cpu = await resources.v1.powerup.get_reserved(state, 'cpu')
        // 0.04985526440273404% represented as float
        assert.equal(cpu, 0.0004933312426372583)
    })
    test('v1.powerup.get_reserved(net)', async function () {
        const state = await resources.v1.powerup.get_state()
        const net = await resources.v1.powerup.get_reserved(state, 'net')
        // 0.0017273973739949453% represented as float
        assert.equal(net, 0.000017099101893048595)
    })
    test('v1.powerup.get_price_per_ms(1)', async function () {
        const state = await resources.v1.powerup.get_state()
        const price = await resources.v1.powerup.get_price_per_ms(state)
        assert.equal(String(price), '0.0006 EOS')
        assert.equal(price.value, 0.0006)
        assert.equal(Number(price.units), 6)
    })
    test('v1.powerup.get_price_per_ms(1000)', async function () {
        const state = await resources.v1.powerup.get_state()
        const price = await resources.v1.powerup.get_price_per_ms(state, 1000)
        assert.equal(String(price), '0.5702 EOS')
        assert.equal(price.value, 0.5702)
        assert.equal(Number(price.units), 5702)
    })
})
