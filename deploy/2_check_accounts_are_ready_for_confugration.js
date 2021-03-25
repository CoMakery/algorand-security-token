#!/usr/bin/env node
const config = require('./deploy.config.js')
const { checkAccountConfig } = require('../lib/algoUtil')

;(async() => {
    let checks = await Promise.all([
        checkAccountConfig("Contract Admin Reserve Account", config.contractAdminReserveAccountAddress, config),
        checkAccountConfig("Temp Launch Account", config.tempLaunchAccount.addr, config),
        checkAccountConfig("Manual Admin Account Address", config.manualAdminAccountAddress, config),
        checkAccountConfig("Hot Wallet Account Address", config.hotWalletAccountAddress, config)
    ])
    console.log(checks)
    let ready = checks.every(check => check['ready'] == true)
    console.log(`\n\nREADY TO RUN CONFIG SCRIPT? ${ready.toLocaleString().toUpperCase()}!!\n`)

})().catch(e => {
    console.log(e)
})