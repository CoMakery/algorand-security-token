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
        `--app-arg 'str:transfer group' --app-arg 'str:lock' ` +
        `--app-arg "int:1" --app-arg "int:1" ` +
        `--app-arg "int:${earliestPermittedTime}"  -d devnet/Primary`

    await shell.exec(transferGroupLock1, {async: false, silent: true})
})

test('blocks transfers that exceed that max balance but not lesser amounts, can transfer', async () => {
    let maxTokenBalance = 10
    let setMaxBalance =
        `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:max balance' --app-account ${receiverAccount.addr} ` +
        `--app-arg "int:${maxTokenBalance}"  -d devnet/Primary`

    await shell.exec(setMaxBalance, {async: false, silent: false})

    //transfer back from timelocked account fails
    let transferBlocked = false
    try {
        appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
        await util.appCall(clientV2, receiverAccount, appId, appArgs, [adminAccount.addr])
    } catch (e) {
        transferBlocked = true
    }
    expect(transferBlocked).toEqual(true)

    // not tokens sent to receiver
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)
    expect(localState["max balance"]["ui"]).toEqual(maxTokenBalance)
})

// test('lock until with a past date allows transfers', async () => {
//     let lockUntilAMinuteAgo = Math.floor(new Date().getTime() / 1000) - 60
//     let lockUntilSet =
//         `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
//         `--app-arg 'str:lock until' --app-account ${receiverAccount.addr} ` +
//         `--app-arg "int:${lockUntilAMinuteAgo}"  -d devnet/Primary`
//
//     console.log(lockUntilSet)
//     await shell.exec(lockUntilSet, {async: false, silent: false})
//
//     // can still transfer to the account
//     appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
//     await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])
//
//     //can transfer back from the account
//     appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
//     await util.appCall(clientV2, receiverAccount, appId, appArgs, [adminAccount.addr])
//
//     // check frozen sender has sent the tokens
//     localState = await util.readLocalState(clientV2, receiverAccount, appId)
//     expect(localState["balance"]["ui"]).toEqual(undefined)
//     expect(localState["lock until"]["ui"]).toEqual(lockUntilAMinuteAgo)
//
//     // and they were transferred back
//     localState = await util.readLocalState(clientV2, adminAccount, appId)
//     expect(localState["balance"]["ui"]).toEqual(27)
// })