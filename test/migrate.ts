import 'mocha'
import {strict as assert} from 'assert'

import {PowerUpState, RAMState, Resources, SampleUsage} from '../src'
import {makeClient} from '@wharfkit/mock-data'
import {UInt128, UInt64} from '@wharfkit/antelope'

const resources = new Resources({api: makeClient('https://eos.greymass.com')})

let powerup: PowerUpState
let us: number
let bytes: number
let frac: UInt128
let usage: SampleUsage
let utilization: UInt64
let utilization_increase: UInt128
let adjusted_utilization: UInt128

suite('migrate', function () {
    setup(async function () {
        // const info = await resources.api.v1.chain.get_info()
        powerup = await resources.v1.powerup.get_state()
        usage = await resources.getSampledUsage()
        us = 1000
        bytes = 1000000
        frac = UInt128.from(powerup.cpu.frac(usage, us))
        utilization = powerup.cpu.utilization
        utilization_increase = powerup.cpu.utilization_increase(frac)
        adjusted_utilization = powerup.cpu.determine_adjusted_utilization()
    })
    suite('cpu', function () {
        test('reserved', async function () {
            const modern = powerup.cpu.reserved
            const legacy = powerup.cpu.reserved_legacy
            assert.equal(
                modern.equals(legacy),
                true,
                `modern=${modern.toString()} legacy=${legacy.toString()}`
            )
        })
        test('allocated', async function () {
            const modern = powerup.cpu.allocated
            const legacy = powerup.cpu.allocated_legacy
            assert.equal(modern, legacy, `modern=${modern} legacy=${legacy}`)
        })
        test('utilization_increase', async function () {
            const frac = UInt128.from(powerup.cpu.frac(usage, us))
            const modern = powerup.cpu.utilization_increase(frac)
            const legacy = powerup.cpu.utilization_increase_legacy(frac)
            assert.equal(
                modern.equals(legacy),
                true,
                `modern=${modern.toString()} legacy=${legacy}`
            )
        })
        test('price_function', async function () {
            const modern = powerup.cpu.price_function(powerup.cpu.utilization)
            const legacy = powerup.cpu.price_function_legacy(powerup.cpu.utilization)
            assert.equal(modern, legacy, `modern=${modern.toString()} legacy=${legacy}`)
        })
        test('price_integral_delta', async function () {
            const start_utilization = utilization
            const end_utilization = start_utilization.adding(utilization_increase)

            const modern = powerup.cpu.price_integral_delta(start_utilization, end_utilization)
            const legacy = powerup.cpu.price_integral_delta_legacy(
                start_utilization,
                end_utilization
            )
            const expected = legacy * Math.pow(10, powerup.cpu.symbol.precision)
            assert.equal(
                modern,
                expected,
                `modern=${modern.toString()} legacy=${expected} (start=${start_utilization.toString()} end=${end_utilization.toString()})`
            )
        })
        test('fee', async function () {
            const modern = powerup.cpu.fee(utilization_increase, adjusted_utilization)
            const legacy = powerup.cpu.fee_legacy(utilization_increase, adjusted_utilization)
            assert.equal(modern, legacy, `modern=${String(modern)} legacy=${legacy}`)
        })
        test('weight_to_us', async function () {
            const weight = 1000000
            const modern = powerup.cpu.weight_to_us(powerup.cpu.weight, weight)
            const legacy = powerup.cpu.weight_to_us_legacy(powerup.cpu.weight, weight)
            assert.equal(
                modern.equals(legacy),
                true,
                `modern=${String(modern)} legacy=${legacy} weight=${weight}`
            )
        })
        test('us_to_weight', async function () {
            const modern = powerup.cpu.us_to_weight(powerup.cpu.weight, us)
            const legacy = powerup.cpu.us_to_weight_legacy(powerup.cpu.weight, us)
            assert.equal(
                modern.equals(legacy),
                true,
                `modern=${String(modern)} legacy=${legacy} us=${us}`
            )
        })
        test('frac_by_us now', async function () {
            const modern = powerup.cpu.frac_by_us(usage, us)
            const legacy = powerup.cpu.frac_by_us_legacy(usage, us)
            assert.equal(
                modern.equals(legacy),
                true,
                `modern=${String(modern)} legacy=${legacy} us=${us}`
            )
        })
        test('price_per_us', async function () {
            const modern = powerup.cpu.price_per_us(usage, us)
            const legacy = powerup.cpu.price_per_us_legacy(usage, us)
            assert.equal(modern, legacy, `modern=${String(modern)} legacy=${legacy} us=${us}`)
        })
    })
    suite('net', function () {
        test('reserved', async function () {
            const modern = powerup.net.reserved
            const legacy = powerup.net.reserved_legacy
            assert.equal(
                modern.equals(legacy),
                true,
                `modern=${modern.toString()} legacy=${legacy.toString()}`
            )
        })
        test('allocated', async function () {
            const modern = powerup.net.allocated
            const legacy = powerup.net.allocated_legacy
            assert.equal(modern, legacy, `modern=${modern} legacy=${legacy}`)
        })
        test('utilization_increase', async function () {
            const frac = UInt128.from(powerup.net.frac(usage, us))
            const modern = powerup.net.utilization_increase(frac)
            const legacy = powerup.net.utilization_increase_legacy(frac)
            assert.equal(
                modern.equals(legacy),
                true,
                `modern=${modern.toString()} legacy=${legacy}`
            )
        })
        test('price_function', async function () {
            const modern = powerup.net.price_function(powerup.net.utilization)
            const legacy = powerup.net.price_function_legacy(powerup.net.utilization)
            assert.equal(modern, legacy, `modern=${modern.toString()} legacy=${legacy}`)
        })
        test('price_integral_delta', async function () {
            const start_utilization = utilization
            const end_utilization = start_utilization.adding(utilization_increase)

            const modern = powerup.net.price_integral_delta(start_utilization, end_utilization)
            const legacy = powerup.net.price_integral_delta_legacy(
                start_utilization,
                end_utilization
            )
            const expected = legacy * Math.pow(10, powerup.net.symbol.precision)
            assert.equal(
                modern,
                expected,
                `modern=${modern.toString()} legacy=${expected} (start=${start_utilization.toString()} end=${end_utilization.toString()})`
            )
        })
        test('fee', async function () {
            const modern = powerup.net.fee(utilization_increase, adjusted_utilization)
            const legacy = powerup.net.fee_legacy(utilization_increase, adjusted_utilization)
            assert.equal(modern, legacy, `modern=${String(modern)} legacy=${legacy}`)
        })
        test('weight_to_bytes', async function () {
            const weight = 1000000
            const modern = powerup.net.weight_to_bytes(powerup.net.weight, weight)
            const legacy = powerup.net.weight_to_bytes_legacy(powerup.net.weight, weight)
            assert.equal(
                modern.equals(legacy),
                true,
                `modern=${String(modern)} legacy=${legacy} weight=${weight}`
            )
        })
        test('bytes_to_weight', async function () {
            const modern = powerup.net.bytes_to_weight(powerup.net.weight, bytes)
            const legacy = powerup.net.bytes_to_weight_legacy(powerup.net.weight, bytes)
            assert.equal(
                modern.equals(legacy),
                true,
                `modern=${String(modern)} legacy=${legacy} bytes=${bytes}`
            )
        })
        test('frac_by_bytes', async function () {
            const modern = powerup.net.frac_by_bytes(usage, bytes)
            const legacy = powerup.net.frac_by_bytes_legacy(usage, bytes)
            assert.equal(
                modern.equals(legacy),
                true,
                `modern=${String(modern)} legacy=${legacy} bytes=${bytes}`
            )
        })
        test('price_per_byte', async function () {
            const modern = powerup.net.price_per_byte(usage, bytes)
            const legacy = powerup.net.price_per_byte_legacy(usage, bytes)
            assert.equal(modern, legacy, `modern=${String(modern)} legacy=${legacy} bytes=${bytes}`)
        })
    })
})
