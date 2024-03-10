import 'mocha'
import {strict as assert} from 'assert'

import {Asset} from '@wharfkit/antelope'
import {makeClient} from '@wharfkit/mock-data'

import {PowerUpState, Resources} from '../src'

const resources_eos = new Resources({
    api: makeClient('https://eos.greymass.com'),
})

const resources_jungle = new Resources({
    api: makeClient('https://jungle4.greymass.com'),
})

const resources_wax = new Resources({
    api: makeClient('https://wax.greymass.com'),
    sampleAccount: 'boost.wax',
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
        assert.equal(powerup.cpu.us_to_weight(sample.cpu, 35868), 397914355)
    })
    test('powerup.cpu.weight_to_us', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()
        assert.equal(powerup.cpu.weight_to_us(sample.cpu, 12930064), 1166)
    })
    test('powerup.cpu.allocated', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()

        assert.equal(powerup.cpu.allocated, 0.99)
        // 70.2192246791559% represented as float
    })
    test('powerup.cpu.reserved', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()

        assert.equal(powerup.cpu.reserved, 0.07891504719871277)
        // 7.891504719871277% represented as float
    })
    test('powerup.cpu.price_per_us(60)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()
        const price = powerup.cpu.price_per_ms(sample, 60, this.testFixture)
        assert.equal(price, 0.0144)
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
        assert.equal(price, 0.239)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.2390 EOS')
        assert.equal(asset.value, 0.239)
        assert.equal(Number(asset.units), 2390)
    })
    test('powerup.cpu.frac()', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const frac1 = powerup.cpu.frac(sample, 100)
        assert.equal(frac1, 2905547)

        const frac1000 = powerup.cpu.frac(sample, 1000000)
        assert.equal(frac1000, 29055489074)
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

        assert.equal(powerup.net.reserved, 0.004102226924904269)
        // 0.4102226924904269% represented as float
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
        assert.equal(frac1000, 5556098)
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

        assert.equal(powerup.cpu.reserved, 0.022093458117636362)
        // 0.032428358627099564% represented as float
    })
    test('powerup.cpu.price_per_us(1000000)', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price_us = powerup.cpu.price_per_us(sample, 1000000, this.testFixture)
        const price_ms = powerup.cpu.price_per_ms(sample, 1000, this.testFixture)
        assert.equal(price_us, price_ms)
        assert.equal(price_ms, 0.4601)
    })
    test('powerup.cpu.price_per_ms(1000)', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(sample, 1000, this.testFixture)
        assert.equal(price, 0.4601)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.4601 EOS')
        assert.equal(asset.value, 0.4601)
        assert.equal(Number(asset.units), 4601)
    })
    test('powerup.cpu.price_per_ms(1000000)', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const sample = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(sample, 1000000, this.testFixture)
        assert.equal(price, 914.8417)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '914.8417 EOS')
        assert.equal(asset.value, 914.8417)
        assert.equal(Number(asset.units), 9148417)
    })
})

suite('[wax] powerup - cpu calculations', function () {
    this.slow(200)
    setup(async function () {
        const info = await resources_wax.api.v1.chain.get_info()
        this.testFixture = Object.assign({}, defaultFixture, {
            virtual_block_cpu_limit: info.virtual_block_cpu_limit,
            virtual_block_net_limit: info.virtual_block_net_limit,
        })
    })
    test('powerup.cpu.allocated', async function () {
        const powerup = await resources_wax.v1.powerup.get_state()

        assert.equal(powerup.cpu.allocated, 0.99)
    })
    test('powerup.cpu.reserved', async function () {
        const powerup = await resources_wax.v1.powerup.get_state()

        assert.equal(powerup.cpu.reserved, 0.1147547419042913)
    })
    test('powerup.cpu.price_per_us(1000000)', async function () {
        const powerup = await resources_wax.v1.powerup.get_state()
        const sample = await resources_wax.getSampledUsage()

        const price_us = powerup.cpu.price_per_us(sample, 1000000, this.testFixture)
        const price_ms = powerup.cpu.price_per_ms(sample, 1000, this.testFixture)
        assert.equal(price_us, price_ms)
        assert.equal(price_ms, 7.6019681)
    })
    test('powerup.cpu.price_per_ms(1000)', async function () {
        const powerup = await resources_wax.v1.powerup.get_state()
        const sample = await resources_wax.getSampledUsage()

        const price = powerup.cpu.price_per_ms(sample, 1000, this.testFixture)
        assert.equal(price, 7.6019681)

        const asset = Asset.from(price, '8,WAX')
        assert.equal(String(asset), '7.60196810 WAX')
        assert.equal(asset.value, 7.6019681)
        assert.equal(Number(asset.units), 760196810)
    })
    test('powerup.cpu.price_per_ms(1000000)', async function () {
        const powerup = await resources_wax.v1.powerup.get_state()
        const sample = await resources_wax.getSampledUsage()

        const price = powerup.cpu.price_per_ms(sample, 1000000, this.testFixture)
        assert.equal(price, 11770.99029685)

        const asset = Asset.from(price, '8,WAX')
        assert.equal(String(asset), '11770.99029685 WAX')
        assert.equal(asset.value, 11770.99029685)
        assert.equal(Number(asset.units), 1177099029685)
    })
})

suite('[wax] powerup - net calculations', function () {
    this.slow(200)
    setup(async function () {
        const info = await resources_wax.api.v1.chain.get_info()
        this.testFixture = Object.assign({}, defaultFixture, {
            virtual_block_cpu_limit: info.virtual_block_cpu_limit,
            virtual_block_net_limit: info.virtual_block_net_limit,
        })
    })
    test('powerup.net.allocated', async function () {
        const powerup = await resources_wax.v1.powerup.get_state()

        assert.equal(powerup.net.allocated, 0.99)
    })
    test('powerup.net.reserved', async function () {
        const powerup = await resources_wax.v1.powerup.get_state()

        assert.equal(powerup.net.reserved, 0.00006380031736302496)
    })
    test('powerup.net.price_per_kb(1000000000000)', async function () {
        const powerup = await resources_wax.v1.powerup.get_state()
        const sample = await resources_wax.getSampledUsage()

        const price = powerup.net.price_per_kb(sample, 1000, this.testFixture)
        assert.equal(price, 0.00044073)

        const asset = Asset.from(price, '8,WAX')
        assert.equal(String(asset), '0.00044073 WAX')
        assert.equal(asset.value, 0.00044073)
        assert.equal(Number(asset.units), 44073)
    })
    test('powerup.net.frac()', async function () {
        const powerup = await resources_wax.v1.powerup.get_state()
        const sample = await resources_wax.getSampledUsage()

        const frac1000 = powerup.net.frac(sample, 1000000)
        assert.equal(frac1000, 50216295)
    })
})
