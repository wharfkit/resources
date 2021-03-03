import 'mocha'
import {strict as assert} from 'assert'
import {join as joinPath} from 'path'

import {APIClient, Asset} from '@greymass/eosio'
import {MockProvider} from './utils/mock-provider'

import {PowerUpState, Resources} from '../src'

const eos = new APIClient({
    provider: new MockProvider(joinPath(__dirname, 'data'), 'https://eos.greymass.com'),
})

const resources = new Resources({api: eos})

suite('powerup', function () {
    this.slow(200)
    test('powerup = v1.powerup.get_state', async function () {
        const powerup = await resources.v1.powerup.get_state()
        assert.equal(powerup instanceof PowerUpState, true)
    })
    test('powerup.cpu.allocated', async function () {
        const powerup = await resources.v1.powerup.get_state()
        assert.equal(powerup.cpu.allocated, 0.12909697392435804)
        // 12.7957297784418% represented as float
    })
    test('powerup.cpu.reserved', async function () {
        const powerup = await resources.v1.powerup.get_state()
        assert.equal(powerup.cpu.reserved, 0.0004933312426372583)
        // 0.04985526440273404% represented as float
    })
    test('powerup.net.reserved', async function () {
        const powerup = await resources.v1.powerup.get_state()
        assert.equal(powerup.net.reserved, 0.000017099101893048595)
        // 0.0017273973739949453% represented as float
    })
    test('powerup.cpu.price_per_ms(1)', async function () {
        const powerup = await resources.v1.powerup.get_state()
        const price = powerup.cpu.price_per_ms(1)
        assert.equal(String(price), '0.0006 EOS')
        assert.equal(price.value, 0.0006)
        assert.equal(Number(price.units), 6)
    })
    test('powerup.cpu.price_per_ms(1000)', async function () {
        const powerup = await resources.v1.powerup.get_state()
        const price = powerup.cpu.price_per_ms(1000)
        assert.equal(String(price), '0.5702 EOS')
        assert.equal(price.value, 0.5702)
        assert.equal(Number(price.units), 5702)
    })
    test('powerup.cpu.frac<Asset>()', async function () {
        const powerup = await resources.v1.powerup.get_state()
        const frac1 = powerup.cpu.frac(Asset.from(1, '4,EOS'))
        assert.equal(frac1, 373409395885)
        const frac1000 = powerup.cpu.frac(Asset.from(1000, '4,EOS'))
        assert.equal(frac1000, 373558669990144)
    })
    test('powerup.cpu.frac<String>()', async function () {
        const powerup = await resources.v1.powerup.get_state()
        const frac1 = powerup.cpu.frac('1.0000 EOS')
        assert.equal(frac1, 373409395885)
        const frac1000 = powerup.cpu.frac('1000.0000 EOS')
        assert.equal(frac1000, 373558669990144)
    })
    test('powerup.net.frac<Asset>()', async function () {
        const powerup = await resources.v1.powerup.get_state()
        const frac1 = powerup.net.frac(Asset.from(1, '4,EOS'))
        assert.equal(frac1, 373409395885)
        const frac1000 = powerup.net.frac(Asset.from(1000, '4,EOS'))
        assert.equal(frac1000, 373558669990144)
    })
    test('powerup.net.frac<String>()', async function () {
        const powerup = await resources.v1.powerup.get_state()
        const frac1 = powerup.net.frac('1.0000 EOS')
        assert.equal(frac1, 373409395885)
        const frac1000 = powerup.net.frac('1000.0000 EOS')
        assert.equal(frac1000, 373558669990144)
    })
})
