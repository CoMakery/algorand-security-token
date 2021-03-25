#!/usr/bin/env node

const config = require('./deploy.config.js')
const { checkAccountConfig, getGlobalAppState } = require('../lib/algoUtil')

;(async() => {
    let tempLaunchAccountInfo = await checkAccountConfig("Temp Launch Account", config.tempLaunchAccount.addr, config)
    let checks = await Promise.all([
        getGlobalAppState(config),
        checkAccountConfig("Contract Admin Reserve Account", config.contractAdminReserveAccountAddress, config),
        tempLaunchAccountInfo,
        checkAccountConfig("Manual Admin Account Address", config.manualAdminAccountAddress, config),
        checkAccountConfig("Hot Wallet Account Address", config.hotWalletAccountAddress, config)
    ])

    console.log(checks)
    if(tempLaunchAccountInfo.roles > 0) {
        console.log(`\nERROR!!! TEMP LAUNCH ACCOUNT STILL AN ADMIN WITH ROLE ${tempLaunchAccountInfo.roles}!!!\n`)
    }
})().catch(e => {
    console.log(e)
})