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

// Fixture for tests to provide reproducable values
const testFixture = {
    timestamp: 1614800043,
}

suite('powerup', function () {
    this.slow(200)
    test('powerup = v1.powerup.get_state', async function () {
        const powerup = await resources.v1.powerup.get_state()

        assert.equal(powerup instanceof PowerUpState, true)
    })
})

suite('powerup - cpu', function () {
    this.slow(200)
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
    test('powerup.cpu.price_per_us(1)', async function () {
        const powerup = await resources.v1.powerup.get_state()

        const price = powerup.cpu.price_per_us(1, testFixture)
        assert.equal(price, 0.0000005683626179062772)
    })
    test('powerup.cpu.price_per_us(1000)', async function () {
        const powerup = await resources.v1.powerup.get_state()

        const price_us = powerup.cpu.price_per_us(1000, testFixture)
        const price_ms = powerup.cpu.price_per_ms(1, testFixture)

        assert.equal(price_us, price_ms)
        assert.equal(price_us, 0.0005683626179062772)
    })
    test('powerup.cpu.price_per_ms(1)', async function () {
        const powerup = await resources.v1.powerup.get_state()

        const price = powerup.cpu.price_per_ms(1, testFixture)
        assert.equal(price, 0.0005683626179062772)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.0006 EOS')
        assert.equal(asset.value, 0.0006)
        assert.equal(Number(asset.units), 6)
    })
    test('powerup.cpu.price_per_ms(1000)', async function () {
        const powerup = await resources.v1.powerup.get_state()

        const price = powerup.cpu.price_per_ms(1000, testFixture)
        assert.equal(price, 0.5701758000922426)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.5702 EOS')
        assert.equal(asset.value, 0.5702)
        assert.equal(Number(asset.units), 5702)
    })
    test('powerup.cpu.frac<Asset>()', async function () {
        const powerup = await resources.v1.powerup.get_state()

        const frac1 = powerup.cpu.frac(Asset.from(1, '4,EOS'), testFixture)
        assert.equal(frac1, 394352560591)

        const frac1000 = powerup.cpu.frac(Asset.from(1000, '4,EOS'), testFixture)
        assert.equal(frac1000, 394352590177050)
    })
    test('powerup.cpu.frac<String>()', async function () {
        const powerup = await resources.v1.powerup.get_state()

        const frac1 = powerup.cpu.frac('1.0000 EOS', testFixture)
        assert.equal(frac1, 394352560591)

        const frac1000 = powerup.cpu.frac('1000.0000 EOS', testFixture)
        assert.equal(frac1000, 394352590177050)
    })
})

suite('powerup - cpu', function () {
    this.slow(200)
    test('powerup.net.allocated', async function () {
        const powerup = await resources.v1.powerup.get_state()

        assert.equal(powerup.net.allocated, 0.12909697392435804)
        // 12.7957297784418% represented as float
    })
    test('powerup.net.reserved', async function () {
        const powerup = await resources.v1.powerup.get_state()

        assert.equal(powerup.net.reserved, 0.000017099101893048595)
        // 0.0017273973739949453% represented as float
    })
    test('powerup.net.price_per_kb(1000000000000)', async function () {
        const powerup = await resources.v1.powerup.get_state()

        const price = powerup.net.price_per_kb(1000, testFixture)
        assert.equal(price, 0.00010695495163425)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.0001 EOS')
        assert.equal(asset.value, 0.0001)
        assert.equal(Number(asset.units), 1)
    })
    test('powerup.net.frac<Asset>()', async function () {
        const powerup = await resources.v1.powerup.get_state()

        const frac1 = powerup.net.frac(Asset.from(0.0001, '4,EOS'), testFixture)
        assert.equal(frac1, 39970479)

        const frac1000 = powerup.net.frac(Asset.from(1, '4,EOS'), testFixture)
        assert.equal(frac1000, 399704824698)
    })
    test('powerup.net.frac<String>()', async function () {
        const powerup = await resources.v1.powerup.get_state()

        const frac1 = powerup.net.frac('0.0001 EOS', testFixture)
        assert.equal(frac1, 39970479)

        const frac1000 = powerup.net.frac('1.0000 EOS', testFixture)
        assert.equal(frac1000, 399704824698)
    })
})
