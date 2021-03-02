#!/usr/bin/env node
const config = require('./deploy.config.js')
const util = require('../lib/algoUtil')

;(async() => {


    let info = await util.deploySecurityToken(
        config.client,
        config.tempLaunchAccount,
        config.token.cap,
        config.token.decimals,
        config.token.symbol,
        config.token.name
    )
    console.log(info)
    let appId = info.appId

    let application = await config.client.getApplicationByID(appId).do()
    let globalState = application['params']['global-state']
    console.log(util.decodeState(globalState))
})().catch(e => {
    console.log(e)
})