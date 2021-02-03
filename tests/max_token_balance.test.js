require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
const {EncodeUint, EncodeBytes} = util
const algosdk = require('algosdk')

const server = "http://127.0.0.1"
const port = 8080

var adminAccount, receiverAccount, token, clientV2, appId

beforeEach(async () => {
    await privateTestNetSetup(appId)
    adminAccount = accounts[0]
    receiverAccount = accounts[1]

    token = await shell.cat(`devnet/Primary/algod.token`).stdout
    clientV2 = new algosdk.Algodv2(token, server, port)
    let info = await util.deploySecurityToken(clientV2, adminAccount)
    appId = info.appId

    //mint
    appArgs = [EncodeBytes("mint"), EncodeUint('27')]
    await util.appCall(clientV2, adminAccount, info.appId, appArgs, [adminAccount.addr])

    //opt in
    await util.optInApp(clientV2, receiverAccount, appId)

    let earliestPermittedTime = 1
    // from group 1 -> 1 is allowed
    let transferGroupLock1 =
        `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:setTransferRule' ` +
        `--app-arg "int:1" --app-arg "int:1" ` +
        `--app-arg "int:${earliestPermittedTime}"  -d devnet/Primary`

    await shell.exec(transferGroupLock1, {async: false, silent: true})
})

test('blocks transfers that exceed the addresses maxBalance but not lesser amounts, can transfer', async () => {
    let maxTokenBalance = 10
    appArgs = [EncodeBytes("setAddressPermissions"), EncodeUint('0'), EncodeUint(`${maxTokenBalance}`), EncodeUint('0'), EncodeUint('1')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // blocks tokens that exceed maxBalance
    let transferBlocked = false
    try {
        appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
        await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])
    } catch (e) {
        transferBlocked = true
    }
    expect(transferBlocked).toEqual(true)

    // no tokens sent to receiver
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)
    expect(localState["maxBalance"]["ui"]).toEqual(maxTokenBalance)

    // allow token transfers that equal maxBalance
    appArgs = [EncodeBytes("transfer"), EncodeUint('10')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // tokens sent to receiver
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(10)

    // allow tokens to be transferred out of the account
    appArgs = [EncodeBytes("transfer"), EncodeUint('10')]
    await util.appCall(clientV2, receiverAccount, appId, appArgs, [adminAccount.addr])

    // tokens sent back to admin
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)
})

test('maxBalance of 0 is treated as no max balance', async () => {
    let maxTokenBalance = 0
    appArgs = [EncodeBytes("setAddressPermissions"), EncodeUint('0'), EncodeUint(`${maxTokenBalance}`), EncodeUint('0'), EncodeUint('1')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // allow token transfers to address with 0 maxBalance
    appArgs = [EncodeBytes("transfer"), EncodeUint('10')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // tokens sent to receiver
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(10)

    // allow tokens to be transferred out of the account
    appArgs = [EncodeBytes("transfer"), EncodeUint('10')]
    await util.appCall(clientV2, receiverAccount, appId, appArgs, [adminAccount.addr])

    // tokens sent back to admin
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)
})