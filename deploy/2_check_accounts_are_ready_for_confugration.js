#!/usr/bin/env node
const config = require('./deploy.config.js')
const util = require('../lib/algoUtil')
const assert = require('assert').strict;

async function checkAccountConfig(name, address) {
    let accountInfo = await config.client.accountInformation(config.contractAdminReserveAccountAddress).do()
    let values = {
        role: name,
        address: config.contractAdminReserveAccountAddress,
        optedIn: accountInfo['created-apps'].some(y => y['id'] == 14395337),
        algoBalance: accountInfo.amount
    }
    values.ready = values.algoBalance > 3000 && values.optedIn == true
    return values
}

;(async() => {
    let checks = await Promise.all([
        checkAccountConfig("Contract Admin Reserve Account", config.contractAdminReserveAccountAddress),
        checkAccountConfig("Temp Launch Account", config.tempLaunchAccount.addr),
        checkAccountConfig("Manual Admin Account Address", config.manualAdminAccountAddress),
        checkAccountConfig("Hot Wallet Account Address", config.hotWalletAccountAddress)
    ])
    console.log(checks)
    let ready = checks.every(check => check['ready'] == true)
    console.log(`\n\nREADY TO RUN CONFIG SCRIPT? ${ready.toLocaleString().toUpperCase()}!!\n`)

})().catch(e => {
    console.log(e)
})