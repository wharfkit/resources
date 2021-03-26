import 'mocha'
import {strict as assert} from 'assert'
import {join as joinPath} from 'path'
import fetch from 'node-fetch'

import {APIClient, Asset} from '@greymass/eosio'
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
        assert.equal(powerup.cpu.us_to_weight(sample.cpu, 35868), 12930064)
    })
    test('powerup.cpu.weight_to_us', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()
        assert.equal(powerup.cpu.weight_to_us(sample.cpu, 12930064), 35868)
    })
    test('powerup.cpu.allocated', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()

        assert.equal(powerup.cpu.allocated, 0.702192246791559)
        // 70.2192246791559% represented as float
    })
    test('powerup.cpu.reserved', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()

        assert.equal(powerup.cpu.reserved, 0.06595032144633618)
        // 6.595032144633618% represented as float
    })
    test('powerup.cpu.price_per_us(60)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()
        const price = powerup.cpu.price_per_ms(sample, 60, this.testFixture)
        assert.equal(price, 0.0178)
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
        assert.equal(price_us, 0.0003)
    })
    test('powerup.cpu.price_per_ms(1)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(sample, 1, this.testFixture)
        assert.equal(price, 0.0003)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.0003 EOS')
        assert.equal(asset.value, 0.0003)
        assert.equal(Number(asset.units), 3)
    })
    test('powerup.cpu.price_per_ms(1000)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(sample, 1000, this.testFixture)
        assert.equal(price, 0.2962)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.2962 EOS')
        assert.equal(asset.value, 0.2962)
        assert.equal(Number(asset.units), 2962)
    })
    test('powerup.cpu.frac()', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const frac1 = powerup.cpu.frac(sample, 100)
        assert.equal(frac1, 3964186)

        const frac1000 = powerup.cpu.frac(sample, 1000000)
        assert.equal(frac1000, 39641899024)
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

        assert.equal(powerup.net.allocated, 0.702192246791559)
        // 70.2192246791559% represented as float
    })
    test('powerup.net.reserved', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()

        assert.equal(powerup.net.reserved, 0.0008143822323200754)
        // 0.08143822323200754% represented as float
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
        assert.equal(frac1000, 7796194)
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

        assert.equal(powerup.cpu.reserved, 0.0002227021086161085)
        // 0.1853124131415894% represented as float
    })
    test('powerup.cpu.price_per_us(1000000)', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price_us = powerup.cpu.price_per_us(sample, 1000000, this.testFixture)
        const price_ms = powerup.cpu.price_per_ms(sample, 1000, this.testFixture)
        assert.equal(price_us, price_ms)
        assert.equal(price_ms, 0.0003)
    })
    test('powerup.cpu.price_per_ms(1000)', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(sample, 1000, this.testFixture)
        assert.equal(price, 0.0003)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.0003 EOS')
        assert.equal(asset.value, 0.0003)
        assert.equal(Number(asset.units), 3)
    })
    test('powerup.cpu.price_per_ms(1000000)', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(sample, 1000000, this.testFixture)
        assert.equal(price, 0.2471)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.2471 EOS')
        assert.equal(asset.value, 0.2471)
        assert.equal(Number(asset.units), 2471)
    })
})
