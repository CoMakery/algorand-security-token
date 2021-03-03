#!/usr/bin/env node
const config = require('./deploy.config.js')
const util = require('../lib/algoUtil')
const fs = require('fs')
const path = require('path')

// this script outputs three transactions to be used by OREID
// They should be signed by the reserve / contract admin account
// transaction to
//
;(async() => {
    let tx = await util.rawDeploySecurityTokenTx(
        config.client,
        config.tempLaunchAccount,
        config.token.cap,
        config.token.decimals,
        config.token.symbol,
        config.token.name
    )

    let deployTxnPath = path.join(__dirname, 'build', 'deploy.txn')
    fs.writeFile(deployTxnPath, JSON.stringify(tx), () => {})
    console.log(`Wrote deploy transaction to build/deploy.txn`)
})().catch(e => {
    console.log(e)
})