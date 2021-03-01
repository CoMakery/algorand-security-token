require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
const algosdk = require('algosdk')

const server = "http://127.0.0.1"
const port = 8080

var reserveContractAdminAccount, tempLaunchAccount, manualAdminAccount, hotWalletAccount, token, client

beforeAll(async () => {
    await privateTestNetSetup()
    reserveContractAdminAccount = accounts[0]
    tempLaunchAccount = algosdk.generateAccount()
    manualAdminAccount = algosdk.generateAccount()

    hotWalletAccount = algosdk.generateAccount()
    token = await shell.cat(`devnet/Primary/algod.token`).stdout
    client =  new algosdk.Algodv2(token, server, port)
})

test('test initial deployment state', async () => {
    let info = await util.deploySecurityToken(client, reserveContractAdminAccount)
    let appId = info.appId
    console.log(info)

    let accountInfo = await client.accountInformation(reserveContractAdminAccount.addr).do();
    console.log("Account balance: %d microAlgos", accountInfo.amount);

    // transfer Algos for gas to the admin accounts
    console.log("fundTempLaunch", tempLaunchAccount)
    await util.transfer(client, reserveContractAdminAccount, tempLaunchAccount.addr, 9000)
    console.log("fundManualAdmin")
    await util.transfer(client, reserveContractAdminAccount, manualAdminAccount.addr, 9000)
    console.log("fundHotWallet")
    await util.transfer(client, reserveContractAdminAccount, hotWalletAccount.addr, 9000)

    // all initial accounts opt in before the tempLaunchAccount configures everything
    await util.optInApp(client, tempLaunchAccount, appId)
    await util.optInApp(client, manualAdminAccount, appId)
    await util.optInApp(client, hotWalletAccount, appId)

    // TODO: check all accounts to be configured have opted in to the application

    // setup tempLaunchAccount that will configure everything by script and then have role removed
    // tempLaunchAccount has no token balance and no transfer group
    // tempLaunchAccount needs Transfer Admin, Wallet Admin
    await util.grantRoles(client, appId, reserveContractAdminAccount, tempLaunchAccount, 7)

    // set the transfer rules
    let fromGroupId = 1
    let toGroupId = 1
    let earliestPermittedTime = 1
    // tempLaunchAccount sets up the transfer rules
    await util.setTransferRule(
        client,
        reserveContractAdminAccount,
        appId,
        fromGroupId,
        toGroupId,
        earliestPermittedTime)

    // let application = await client.getApplicationByID(appId).do()
    // let globalState = application['params']['global-state']
    // console.log(util.decodeState(globalState))


    // manualAdmin account: transferRules, walletAdmin, hotWallet group
    await util.grantRoles(client, appId, tempLaunchAccount, manualAdminAccount, 3)
    await util.setAddressPermissions(client, appId, tempLaunchAccount, manualAdminAccount, 1, 0,0, 2)

    // hotWallet: walletAdmin, hotWallet group
    await util.grantRoles(client, appId, tempLaunchAccount, hotWalletAccount, 1)
    await util.setAddressPermissions(client, appId, tempLaunchAccount, hotWalletAccount, 1, 0,0, 2)

    // the reserve admin mints initial tokens needed for hot wallet distribution into the hot wallet
    await util.mint(client, appId, tempLaunchAccount, hotWalletAccount, 1000)

    // remove launch account, this may need to be done manually by a multi-sig contract admin account
    await util.grantRoles(client, appId, reserveContractAdminAccount, tempLaunchAccount, 0)

    // assert validation, for use after actual deployment
})
