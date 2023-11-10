import 'mocha'
import {strict as assert} from 'assert'

import {RAMState, Resources} from '../src'
import {makeClient} from '@wharfkit/mock-data'

const resources = new Resources({api: makeClient('https://eos.greymass.com')})

suite('[eos] ram calculations', function () {
    this.slow(200)
    test('v1.ram.get_state', async function () {
        const ram = await resources.v1.ram.get_state()
        assert.equal(ram instanceof RAMState, true)
    })
    test('ram.price_per(100)', async function () {
        const ram = await resources.v1.ram.get_state()
        assert.equal(ram.price_per(100).value, 0.0016)
    })
    test('ram.price_per(100000)', async function () {
        const ram = await resources.v1.ram.get_state()
        assert.equal(ram.price_per(100000).value, 1.5723)
    })
    test('ram.price_per_kb(1)', async function () {
        const ram = await resources.v1.ram.get_state()
        const control = ram.price_per(1000)
        const actual = ram.price_per_kb(1)
        assert.equal(control.value, 0.0158)
        assert.equal(actual.value, 0.0158)
        assert.equal(actual.equals(control), true)
    })
})
