require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
const deployUtil = require('../lib/deployUtil')
const algosdk = require('algosdk')
jest.setTimeout(180000)

const server = "http://127.0.0.1"
const port = 8080

var reserveContractAdminAccount, tempLaunchAccount, manualAdminAccount, hotWalletAccount, token, client, config

beforeAll(async () => {
    await privateTestNetSetup()
    reserveContractAdminAccount = accounts[0]
    tempLaunchAccount = accounts[1]
    manualAdminAccount = accounts[2]
    hotWalletAccount = accounts[3]

    token = await shell.cat(`devnet/Primary/algod.token`).stdout
    client = new algosdk.Algodv2(token, server, port)

    config = {
        tempLaunchAccount: tempLaunchAccount,
        manualAdminAccountAddress: manualAdminAccount.addr,
        hotWalletAccountAddress: hotWalletAccount.addr,
        reserveContractAdminAddress: reserveContractAdminAccount.addr,
        transferRules: [
            {from: 2, to: 3, after: 1},
            {from: 3, to: 4, after: 1}
        ],
        hotWalletBalance: 1000
    }
})


test('test deployment configuration script', async () => {
    let info = await util.deploySecurityToken(client, reserveContractAdminAccount)
    let appId = info.appId
    console.log(info)

    // all initial accounts opt in before the tempLaunchAccount configures everything
    await Promise.all([
        util.optInApp(client, tempLaunchAccount, appId),
        util.optInApp(client, manualAdminAccount, appId),
        util.optInApp(client, hotWalletAccount, appId)
    ])

    deployUtil.checkAllAccountsReady(client, appId, config)

    // setup tempLaunchAccount that will configure everything by script and then have role removed
    // tempLaunchAccount has no token balance and no transfer group
    await util.grantRoles(client, appId, reserveContractAdminAccount, config.tempLaunchAccount.addr, 15)

    deployUtil.configureContract(client, appId, config)

    // remove launch account, this may need to be done manually by a multi-sig contract admin account
    // await util.grantRoles(client, appId, reserveContractAdminAccount, config.tempLaunchAccountAddress, 0)

})
