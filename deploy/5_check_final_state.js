#!/usr/bin/env node

const config = require('./deploy.config.js')
const util = require('../lib/algoUtil')

// this script outputs three transactions to be used by OREID
// They should be signed by the reserve / contract admin account
// transaction to
//
;(async() => {
    let application = await config.client.getApplicationByID(config.appId).do()
    let globalState = application['params']['global-state']
    console.log(util.decodeState(globalState))
    console.log(util.decodeState("MORE CHECKS REMAINING - NOT FULLY IMPLEMENTED YET"))
})().catch(e => {
    console.log(e)
})