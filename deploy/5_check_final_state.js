#!/usr/bin/env node

const config = require('./deploy.config.js')
const util = require('../lib/algoUtil')

async function checkAccountConfig(name, address, _config = config) {
    let accountInfo = await _config.client.accountInformation(address).do()
    let values = {
        name: name,
        address: address,
        optedIn: accountInfo['apps-local-state'].some(y => y['id'] == _config.appId),
        algoBalance: accountInfo.amount
    }
    values.ready = values.algoBalance > 3000 && values.optedIn == true

    if(values.optedIn) {
        let localState = util.decodeState(accountInfo['apps-local-state'].find(y => y['id'] == _config.appId)['key-value'])
        values.roles = localState.roles.uint
        values.transferGroup = localState.uint
        values.balance = localState.balance.uint
    } else {
        values.localState = null
    }

    return values
}

async function getGlobalAppState(client, appId) {
    let application = await client.getApplicationByID(appId).do()
    let globalState = application['params']['global-state']
    let dState = util.decodeState(globalState)
    return {
        symbol: dState.symbol.bytes,
        totalSupply: dState.totalSupply.uint,
        cap: dState.cap.uint,
        decimals: dState.decimals.uint,
        name: dState.name.bytes,
        paused: dState.paused.uint,
        reserve: dState.reserve.uint
    }
}


;(async() => {
    let tempLaunchAccountInfo = await checkAccountConfig("Temp Launch Account", config.tempLaunchAccount.addr)
    let checks = await Promise.all([
        getGlobalAppState(config.client, config.appId),
        checkAccountConfig("Contract Admin Reserve Account", config.contractAdminReserveAccountAddress),
        tempLaunchAccountInfo,
        checkAccountConfig("Manual Admin Account Address", config.manualAdminAccountAddress),
        checkAccountConfig("Hot Wallet Account Address", config.hotWalletAccountAddress)
    ])

    console.log(checks)
    if(tempLaunchAccountInfo.roles > 0) {
        console.log(`\nERROR!!! TEMP LAUNCH ACCOUNT STILL AN ADMIN WITH ROLE ${tempLaunchAccountInfo.roles}!!!\n`)
    }
})().catch(e => {
    console.log(e)
})