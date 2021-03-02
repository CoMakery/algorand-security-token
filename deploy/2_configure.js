#!/usr/bin/env node
// This script can only be run after the admin, sub reserve and hot wallet accounts
// have opted in to the algorand application.

// setup tempLaunchAccount that will configure everything by script and then have role removed
// tempLaunchAccount has Algos for gas, no token balance and no transfer group

// remove launch account, this may need to be done manually by a multi-sig contract admin account
// after launch set the tempLaunchAccount role to 0 (no powers)
// await util.grantRoles(client, appId, reserveContractAdminAccount, config.tempLaunchAccountAddress, 0)
const config = require('./deploy.config.js')
const deployUtil = require('../lib/deployUtil')


;(async() => {
    deployUtil.checkAllAccountsReady(config.client, config.appId, config)
    deployUtil.configureContract(config.client, config.appId, config)
})().catch(e => {
    console.log(e)
})