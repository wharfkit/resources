import 'mocha'
import {strict as assert} from 'assert'
import {join as joinPath} from 'path'
import fetch from 'node-fetch'

import {APIClient, Asset} from '@wharfkit/antelope'
import {MockProvider} from './utils/mock-provider'

import {PowerUpState, Resources} from '../src'

const resources_eos = new Resources({
    api: new APIClient({
        provider: new MockProvider(joinPath(__dirname, 'data'), 'https://eos.greymass.com'),
    }),
})

const resources_jungle = new Resources({
    api: new APIClient({
        provider: new MockProvider(joinPath(__dirname, 'data'), 'https://jungle3.greymass.com'),
    }),
})

// Fixture for tests to provide reproducable values
const defaultFixture = {
    timestamp: 1616784396,
}

suite('powerup', function () {
    this.slow(200)
    test('powerup = v1.powerup.get_state', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        assert.equal(powerup instanceof PowerUpState, true)
    })
})

suite('[eos] powerup - cpu calculations', function () {
    this.slow(200)
    setup(async function () {
        const info = await resources_eos.api.v1.chain.get_info()
        this.testFixture = Object.assign({}, defaultFixture, {
            virtual_block_cpu_limit: info.virtual_block_cpu_limit,
            virtual_block_net_limit: info.virtual_block_net_limit,
        })
    })
    test('powerup.cpu.us_to_weight', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()
        assert.equal(powerup.cpu.us_to_weight(sample.cpu, 35868), 407590909)
    })
    test('powerup.cpu.weight_to_us', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()
        assert.equal(powerup.cpu.weight_to_us(sample.cpu, 12930064), 1138)
    })
    test('powerup.cpu.allocated', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()

        assert.equal(powerup.cpu.allocated, 0.99)
        // 70.2192246791559% represented as float
    })
    test('powerup.cpu.reserved', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()

        assert.equal(powerup.cpu.reserved, 0.03816527191292494)
        // 3.816527191292494% represented as float
    })
    test('powerup.cpu.price_per_us(60)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()
        const price = powerup.cpu.price_per_ms(sample, 60, this.testFixture)
        assert.equal(price, 0.0098)
    })
    test('powerup.cpu.price_per_us(1)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_us(sample, 1, this.testFixture)
        assert.equal(price, 0.0001)
    })
    test('powerup.cpu.price_per_us(1000)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price_us = powerup.cpu.price_per_us(sample, 1000, this.testFixture)
        const price_ms = powerup.cpu.price_per_ms(sample, 1, this.testFixture)

        assert.equal(price_us, price_ms)
        assert.equal(price_us, 0.0002)
    })
    test('powerup.cpu.price_per_ms(1)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(sample, 1, this.testFixture)
        assert.equal(price, 0.0002)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.0002 EOS')
        assert.equal(asset.value, 0.0002)
        assert.equal(Number(asset.units), 2)
    })
    test('powerup.cpu.price_per_ms(1000)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(sample, 1000, this.testFixture)
        assert.equal(price, 0.1632)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.1632 EOS')
        assert.equal(asset.value, 0.1632)
        assert.equal(Number(asset.units), 1632)
    })
    test('powerup.cpu.frac()', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const frac1 = powerup.cpu.frac(sample, 100)
        assert.equal(frac1, 2976204)

        const frac1000 = powerup.cpu.frac(sample, 1000000)
        assert.equal(frac1000, 29762065741)
    })
})

suite('[eos] powerup - net calculations', function () {
    this.slow(200)
    setup(async function () {
        const info = await resources_eos.api.v1.chain.get_info()
        this.testFixture = Object.assign({}, defaultFixture, {
            virtual_block_cpu_limit: info.virtual_block_cpu_limit,
            virtual_block_net_limit: info.virtual_block_net_limit,
        })
    })
    test('powerup.net.allocated', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()

        assert.equal(powerup.net.allocated, 0.99)
        // 99% represented as float
    })
    test('powerup.net.reserved', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()

        assert.equal(powerup.net.reserved, 0.0005123029024892572)
        // 0.05123029024892572% represented as float
    })
    test('powerup.net.price_per_kb(1000000000000)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price = powerup.net.price_per_kb(sample, 1000, this.testFixture)
        assert.equal(price, 0.0001)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.0001 EOS')
        assert.equal(asset.value, 0.0001)
        assert.equal(Number(asset.units), 1)
    })
    test('powerup.net.frac()', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const frac1000 = powerup.net.frac(sample, 1000000)
        assert.equal(frac1000, 5586469)
    })
})

suite('[jungle] powerup - cpu calculations', function () {
    this.slow(200)
    setup(async function () {
        const info = await resources_jungle.api.v1.chain.get_info()
        this.testFixture = Object.assign({}, defaultFixture, {
            virtual_block_cpu_limit: info.virtual_block_cpu_limit,
            virtual_block_net_limit: info.virtual_block_net_limit,
        })
    })
    test('powerup.cpu.allocated', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()

        assert.equal(powerup.cpu.allocated, 0.99)
        // 99% represented as float
    })
    test('powerup.cpu.reserved', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()

        assert.equal(powerup.cpu.reserved, 0.00032428358627099564)
        // 0.032428358627099564% represented as float
    })
    test('powerup.cpu.price_per_us(1000000)', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price_us = powerup.cpu.price_per_us(sample, 1000000, this.testFixture)
        const price_ms = powerup.cpu.price_per_ms(sample, 1000, this.testFixture)
        assert.equal(price_us, price_ms)
        assert.equal(price_ms, 0.008)
    })
    test('powerup.cpu.price_per_ms(1000)', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(sample, 1000, this.testFixture)
        assert.equal(price, 0.008)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.0080 EOS')
        assert.equal(asset.value, 0.008)
        assert.equal(Number(asset.units), 80)
    })
    test('powerup.cpu.price_per_ms(1000000)', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(sample, 1000000, this.testFixture)
        assert.equal(price, 8.1469)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '8.1469 EOS')
        assert.equal(asset.value, 8.1469)
        assert.equal(Number(asset.units), 81469)
    })
})
