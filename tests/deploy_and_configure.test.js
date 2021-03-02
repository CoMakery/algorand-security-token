require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
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
        transferRules: [
            {from: 2, to: 3, after: 1},
            {from: 3, to: 4, after: 1}
            ],
        hotWalletBalance: 1000
    }
})

async function checkOptedInAndHasAlgos(_client, _addr, appId) {
    let accountInfo = await _client.accountInformation(_addr).do()
    console.log(accountInfo)

    expect(accountInfo.amount).toBeGreaterThan(10000)
    expect(accountInfo['apps-local-state']).toEqual(
        expect.arrayContaining([
                expect.objectContaining({id: appId})
            ]
        )
    )
}

async function checkAllAccountsReady(client, appId, config) {
    // check all accounts to be configured have opted in to the application and have algos for gas
    await checkOptedInAndHasAlgos(client, config.tempLaunchAccount.addr, appId)
    await checkOptedInAndHasAlgos(client, config.manualAdminAccountAddress, appId)
    await checkOptedInAndHasAlgos(client, config.hotWalletAccountAddress, appId)
}

async function configureContract(client, appId, config) {
    // set the transfer rules

    await Promise.all(config.transferRules.map(rule => {
            util.setTransferRule(
                client,
                tempLaunchAccount,
                appId,
                rule.from,
                rule.to,
                rule.after)
        })
    )

    // manualAdmin account: transferRules, walletAdmin, admin transfer group
    await util.grantRoles(client, appId, config.tempLaunchAccount, config.manualAdminAccountAddress, 3)
    await util.setAddressPermissions(client, appId, config.tempLaunchAccount, config.manualAdminAccountAddress, 0, 0, 0, 2)

    // hotWallet: walletAdmin, admin transfer group
    await util.grantRoles(client, appId, config.tempLaunchAccount, config.hotWalletAccountAddress, 1)
    await util.setAddressPermissions(client, appId, config.tempLaunchAccount, config.hotWalletAccountAddress, 0, 0, 0, 2)

    // the reserve admin mints initial tokens needed for hot wallet distribution into the hot wallet
    await util.mint(client, appId, config.tempLaunchAccount, config.hotWalletAccountAddress, config.hotWalletBalance)
}

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

    checkAllAccountsReady(client, appId, config)

    // setup tempLaunchAccount that will configure everything by script and then have role removed
    // tempLaunchAccount has no token balance and no transfer group
    await util.grantRoles(client, appId, reserveContractAdminAccount, config.tempLaunchAccount.addr, 15)

    configureContract(client, appId, config)

    // remove launch account, this may need to be done manually by a multi-sig contract admin account
    // await util.grantRoles(client, appId, reserveContractAdminAccount, config.tempLaunchAccountAddress, 0)

    // assert validation, for use after actual deployment
})
