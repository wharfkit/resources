import 'mocha'
import {strict as assert} from 'assert'
import fetch from 'node-fetch'

import {APIClient} from '@greymass/eosio'

import {PowerUpState, Resources} from '../src'

suite('core', function () {
    this.slow(200)
    test('init - url + fetch', async function () {
        // pass fetch and url to resources directly
        const test = new Resources({
            url: 'https://eos.greymass.com',
            fetch,
        })
        // perform test
        const state = await test.v1.powerup.get_state()
        assert.equal(state instanceof PowerUpState, true)
    })
    test('init - api + url + fetch', async function () {
        // setup custom APIClient
        const api = new APIClient({
            url: 'https://eos.greymass.com',
            fetch,
        })
        // pass API to resources
        const test = new Resources({api})
        // perform test
        const state = await test.v1.powerup.get_state()
        assert.equal(state instanceof PowerUpState, true)
    })
})
