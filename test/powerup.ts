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
    timestamp: 1614800043,
}

suite('powerup', function () {
    this.slow(200)
    test('powerup = v1.powerup.get_state', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()

        assert.equal(powerup instanceof PowerUpState, true)
    })
})

suite('[eos] powerup - cpu', function () {
    this.slow(200)
    setup(async function () {
        const info = await resources_eos.api.v1.chain.get_info()
        this.testFixture = Object.assign({}, defaultFixture, {
            virtual_block_cpu_limit: info.virtual_block_cpu_limit,
            virtual_block_net_limit: info.virtual_block_net_limit,
        })
    })
    test('powerup.cpu.allocated', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()

        assert.equal(powerup.cpu.allocated, 0.12909697392435804)
        // 12.7957297784418% represented as float
    })
    test('powerup.cpu.reserved', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()

        assert.equal(powerup.cpu.reserved, 0.0004933312426372583)
        // 0.04985526440273404% represented as float
    })
    test('powerup.cpu.price_per_us(60)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()
        const price = powerup.cpu.price_per_ms(usage, 60, this.testFixture)
        assert.equal(price, 0.030407909936451667)
    })

    test('powerup.cpu.price_per_us(1)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_us(usage, 1, this.testFixture)
        assert.equal(price, 5.067185541356402e-7)
    })
    test('powerup.cpu.price_per_us(1000)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const price_us = powerup.cpu.price_per_us(usage, 1000, this.testFixture)
        const price_ms = powerup.cpu.price_per_ms(usage, 1, this.testFixture)

        assert.equal(price_us, price_ms)
        assert.equal(price_us, 0.0005067185541356402)
    })
    test('powerup.cpu.price_per_ms(1)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(usage, 1, this.testFixture)
        assert.equal(price, 0.0005067185541356402)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.0005 EOS')
        assert.equal(asset.value, 0.0005)
        assert.equal(Number(asset.units), 5)
    })
    test('powerup.cpu.price_per_ms(1000)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(usage, 1000, this.testFixture)
        assert.equal(price, 0.5081589909207886)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.5082 EOS')
        assert.equal(asset.value, 0.5082)
        assert.equal(Number(asset.units), 5082)
    })
    test('powerup.cpu.frac<Asset>()', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const frac1 = powerup.cpu.frac(usage, Asset.from(1, '4,EOS'), this.testFixture)
        assert.equal(frac1, 442326946148)

        const frac1000 = powerup.cpu.frac(usage, Asset.from(1000, '4,EOS'), this.testFixture)
        assert.equal(frac1000, 442326946148909)
    })
    test('powerup.cpu.frac<String>()', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const frac1 = powerup.cpu.frac(usage, '1.0000 EOS', this.testFixture)
        assert.equal(frac1, 442326946148)

        const frac1000 = powerup.cpu.frac(usage, '1000.0000 EOS', this.testFixture)
        assert.equal(frac1000, 442326946148909)
    })
})

suite('[eos] powerup - net', function () {
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

        assert.equal(powerup.net.allocated, 0.12909697392435804)
        // 12.7957297784418% represented as float
    })
    test('powerup.net.reserved', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()

        assert.equal(powerup.net.reserved, 0.000017099101893048595)
        // 0.0017273973739949453% represented as float
    })
    test('powerup.net.price_per_kb(1000000000000)', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const price = powerup.net.price_per_kb(usage, 1000, this.testFixture)
        assert.equal(price, 0.00015375722317226783)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.0002 EOS')
        assert.equal(asset.value, 0.0002)
        assert.equal(Number(asset.units), 2)
    })
    test('powerup.net.frac<Asset>()', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const frac1 = powerup.net.frac(usage, Asset.from(0.0001, '4,EOS'), this.testFixture)
        assert.equal(frac1, 27803838)

        const frac1000 = powerup.net.frac(usage, Asset.from(1, '4,EOS'), this.testFixture)
        assert.equal(frac1000, 278038386190)
    })
    test('powerup.net.frac<String>()', async function () {
        const powerup = await resources_eos.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const frac1 = powerup.net.frac(usage, '0.0001 EOS', this.testFixture)
        assert.equal(frac1, 27803838)

        const frac1000 = powerup.net.frac(usage, '1.0000 EOS', this.testFixture)
        assert.equal(frac1000, 278038386190)
    })
})

suite('[jungle] powerup - cpu', function () {
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

        assert.equal(powerup.cpu.reserved, 0.001853124131415894)
        // 0.1853124131415894% represented as float
    })
    test('powerup.cpu.price_per_us(1000000)', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_us(usage, 1000000, this.testFixture)
        assert.equal(price, 0.00011887744982088519)
    })
    test('powerupp.cpu.price_per_us(1000000)', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const price_us = powerup.cpu.price_per_us(usage, 1000000, this.testFixture)
        const price_ms = powerup.cpu.price_per_ms(usage, 1000, this.testFixture)
        assert.equal(price_us, price_ms)
        assert.equal(price_ms, 0.00011887744982088519)
    })
    test('powerup.cpu.price_per_ms(1000)', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(usage, 1000, this.testFixture)
        assert.equal(price, 0.00011887744982088519)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.0001 EOS')
        assert.equal(asset.value, 0.0001)
        assert.equal(Number(asset.units), 1)
    })
    test('powerup.cpu.price_per_ms(1000000)', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const price = powerup.cpu.price_per_ms(usage, 1000000, this.testFixture)
        assert.equal(price, 0.11887744982088519)

        const asset = Asset.from(price, '4,EOS')
        assert.equal(String(asset), '0.1189 EOS')
        assert.equal(asset.value, 0.1189)
        assert.equal(Number(asset.units), 1189)
    })
    test('powerup.cpu.frac<Asset>()', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const frac1 = powerup.cpu.frac(usage, Asset.from(1, '4,EOS'), this.testFixture)
        assert.equal(frac1, 245862102754)

        const frac1000 = powerup.cpu.frac(usage, Asset.from(1000, '4,EOS'), this.testFixture)
        assert.equal(frac1000, 245862102754163)
    })
    test('powerup.cpu.frac<String>()', async function () {
        const powerup = await resources_jungle.v1.powerup.get_state()
        const usage = await resources_eos.getSampledUsage()

        const frac1 = powerup.cpu.frac(usage, '1.0000 EOS', this.testFixture)
        assert.equal(frac1, 245862102754)

        const frac1000 = powerup.cpu.frac(usage, '1000.0000 EOS', this.testFixture)
        assert.equal(frac1000, 245862102754163)
    })
})
