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

test('lockUntil in the future blocks transfers from that address - but not to it', async () => {
    let lockUntilUnixTimestampTomorrow = Math.floor(new Date().getTime() / 1000) + (60 * 60 * 24)
    appArgs = [EncodeBytes("setAddressPermissions"), EncodeUint('0'), EncodeUint('0'), EncodeUint(`${lockUntilUnixTimestampTomorrow}`), EncodeUint('1')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])
    
    // can still transfer to the account
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    //transfer back from timelocked account fails
    let transferBlocked = false
    try {
        appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
        await util.appCall(clientV2, receiverAccount, appId, appArgs, [adminAccount.addr])
    } catch (e) {
        transferBlocked = true
    }
    expect(transferBlocked).toEqual(true)

    // check frozen sender has same amount of tokens
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(11)
    expect(localState["lockUntil"]["ui"]).toEqual(lockUntilUnixTimestampTomorrow)

    // and they didn't get transferred back
    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(16)
})

test('lockUntil with a past date allows transfers', async () => {
    let lockUntilAMinuteAgo = Math.floor(new Date().getTime() / 1000) - 60
    appArgs = [EncodeBytes("setAddressPermissions"), EncodeUint('0'), EncodeUint('0'), EncodeUint(`${lockUntilAMinuteAgo}`), EncodeUint('1')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // can still transfer to the account
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    //can transfer back from the account
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, receiverAccount, appId, appArgs, [adminAccount.addr])

    // check frozen sender has sent the tokens
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)
    expect(localState["lockUntil"]["ui"]).toEqual(lockUntilAMinuteAgo)

    // and they were transferred back
    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(27)
})