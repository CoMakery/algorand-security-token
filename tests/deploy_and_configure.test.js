require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
const algosdk = require('algosdk')
jest.setTimeout(180000)

const server = "http://127.0.0.1"
const port = 8080

var reserveContractAdminAccount, tempLaunchAccount, manualAdminAccount, hotWalletAccount, token, client

beforeAll(async () => {
    await privateTestNetSetup()
    reserveContractAdminAccount = accounts[0]
    tempLaunchAccount = accounts[1]
    manualAdminAccount = accounts[2]

    hotWalletAccount = accounts[3]
    token = await shell.cat(`devnet/Primary/algod.token`).stdout
    client = new algosdk.Algodv2(token, server, port)
})

async function transferAlgos(from, to, amount) {
    await shell.exec(
        `goal clerk send --from ${from} --to ${to} --amount=${amount} -d devnet/Primary/`, {
            async: false,
            silent: false
        })

}

test('test initial deployment state', async () => {
    let info = await util.deploySecurityToken(client, reserveContractAdminAccount)
    let appId = info.appId
    console.log(info)

    let accountInfo = await client.accountInformation(reserveContractAdminAccount.addr).do();
    console.log("Account balance: %d microAlgos", accountInfo.amount);

    // all initial accounts opt in before the tempLaunchAccount configures everything
    await Promise.all([
        util.optInApp(client, tempLaunchAccount, appId),
        util.optInApp(client, manualAdminAccount, appId),
        util.optInApp(client, hotWalletAccount, appId)
    ])

    // TODO: check all accounts to be configured have opted in to the application

    // setup tempLaunchAccount that will configure everything by script and then have role removed
    // tempLaunchAccount has no token balance and no transfer group
    await util.grantRoles(client, appId, reserveContractAdminAccount, tempLaunchAccount.addr, 15)

    // set the transfer rules
    let transferRules = [{from: 2, to: 3, after: 1}]

    await Promise.all(transferRules.map(rule => {
            util.setTransferRule(
                client,
                reserveContractAdminAccount,
                appId,
                rule.from,
                rule.to,
                rule.after)
        })
    )

    // manualAdmin account: transferRules, walletAdmin, hotWallet group
    await util.grantRoles(client, appId, tempLaunchAccount, manualAdminAccount.addr, 3)
    await util.setAddressPermissions(client, appId, tempLaunchAccount, manualAdminAccount.addr, 0, 0, 0, 2)

    // hotWallet: walletAdmin, hotWallet group
    await util.grantRoles(client, appId, tempLaunchAccount, hotWalletAccount.addr, 1)
    await util.setAddressPermissions(client, appId, tempLaunchAccount, hotWalletAccount.addr, 0, 0, 0, 2)

    // the reserve admin mints initial tokens needed for hot wallet distribution into the hot wallet
    await util.mint(client, appId, tempLaunchAccount, hotWalletAccount, 1000)

    // remove launch account, this may need to be done manually by a multi-sig contract admin account
    await util.grantRoles(client, appId, reserveContractAdminAccount, tempLaunchAccount.addr, 0)

    // assert validation, for use after actual deployment
})
