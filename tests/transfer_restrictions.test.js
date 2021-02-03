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
})

test('has expected starting test state', async () => {
    // check minting result
    let localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["balance"]["ui"].toString()).toEqual('27')
    let status =  await shell.exec(` goal app read --global --app-id ${appId} -d devnet/Primary/`, {
        async: false,
        silent: true
    }).stdout
    console.log(status)
    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['cap']['ui'].toString()).toEqual('80000000000000000')
    expect(globalState['reserve']['ui'].toString()).toEqual("79999999999999973")

    // recipient opted in
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    // goal app read returns these undefined values, so it may be at some deep level
    expect(localState["balance"]["ui"]).toEqual(undefined)
    expect(localState["contract admin"]).toEqual(undefined)
    expect(localState["transfer admin"]).toEqual(undefined)
})

test('cannot transfer by default from and to the default group 1 -> 1', async () => {
    try {
        appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
        await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])
    } catch (e) {
        expect(e.message).toEqual("Bad Request")
    }
    // check first receiver got no tokens and is in group 1
    let localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["transferGroup"]["ui"]).toEqual(1)
    expect(localState["balance"]["ui"]).toEqual(undefined)

    // check sender sent no tokens and is in group 1
    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["transferGroup"]["ui"]).toEqual(1)
    expect(localState["balance"]["ui"]).toEqual(27)
})

test('simple transfer back and forth: with group 1 -> 1 permitted', async () => {
    let fromGroupId = 1
    let toGroupId = 1
    let earliestPermittedTime = 1

    let transferGroupLock =
        `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:setTransferRule' ` +
        `--app-arg "int:${fromGroupId}" --app-arg "int:${toGroupId}" ` +
        `--app-arg "int:${earliestPermittedTime}"  -d devnet/Primary`

    await shell.exec(transferGroupLock, {async: false, silent: false})

    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['reserve']['ui'].toString()).toEqual('79999999999999973')

    //transfer
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // check receiver got tokens
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(11)

    // check sender has less tokens
    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(16)

    // check global supply is same
    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['cap']['ui'].toString()).toEqual('80000000000000000')
    expect(globalState['reserve']['ui'].toString()).toEqual('79999999999999973')

    // ======
    //transfer back
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, receiverAccount, appId, appArgs, [adminAccount.addr])

    // check original sender got tokens back
    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(27)

    // check tokens deducted
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)

    // check global supply is same
    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['cap']['ui'].toString()).toEqual('80000000000000000')
    expect(globalState['reserve']['ui'].toString()).toEqual('79999999999999973')
})

test('can lock the default address category for transfers', async () => {
    let fromGroupId = 1
    let toGroupId = 1
    let lockUntilUnixTimestampTomorrow = Math.floor(new Date().getTime() / 1000) + (60 * 60 * 24)

    let transferGroupLock =
        `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:setTransferRule' ` +
        `--app-arg "int:${fromGroupId}" --app-arg "int:${toGroupId}" ` +
        `--app-arg "int:${lockUntilUnixTimestampTomorrow}"  -d devnet/Primary`

    await shell.exec(transferGroupLock, {async: false, silent: false})

    // transfer should be rejected
    try {
        appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
        await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])
    } catch (e) {
        expect(e.message).toEqual("Bad Request")
    }
    // check first receiver who is not approved to receive tokens by default, didn't get the tokens
    let localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)
})

test('simple transfer from group 0 -> 0 works when permitted', async () => {
    let fromGroupId = 0
    let toGroupId = 0
    let earliestPermittedTime = 1

    let transferGroupLock =
        `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:setTransferRule' ` +
        `--app-arg "int:${fromGroupId}" --app-arg "int:${toGroupId}" ` +
        `--app-arg "int:${earliestPermittedTime}"  -d devnet/Primary`

    appArgs = [EncodeBytes("setAddressPermissions"), EncodeUint('0'), EncodeUint('0'), EncodeUint('0'), EncodeUint('0')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [adminAccount.addr])
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    await shell.exec(transferGroupLock, {async: false, silent: false})

    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['reserve']['ui'].toString()).toEqual('79999999999999973')

    //transfer
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // check receiver got tokens
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(11)
    expect(localState["transferGroup"]["ui"]).toEqual(undefined)

    // check sender has less tokens
    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(16)
    expect(localState["transferGroup"]["ui"]).toEqual(undefined)

    // check global supply is same
    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['cap']['ui'].toString()).toEqual('80000000000000000')
    expect(globalState['reserve']['ui'].toString()).toEqual('79999999999999973')

    // ======
    //transfer back
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, receiverAccount, appId, appArgs, [adminAccount.addr])

    // check original sender got tokens back
    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(27)

    // check tokens deducted
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)

    // check global supply is same
    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['cap']['ui'].toString()).toEqual('80000000000000000')
    expect(globalState['reserve']['ui'].toString()).toEqual('79999999999999973')
})

test('can transfer to an account if the transfer rule lock has expired', async () => {
    let fromGroupId = 1
    let toGroupId = 1
    let lockUntilAMinuteAgo = Math.floor(new Date().getTime() / 1000) - 60

    let transferGroupLock =
        `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:setTransferRule' ` +
        `--app-arg "int:${fromGroupId}" --app-arg "int:${toGroupId}" ` +
        `--app-arg "int:${lockUntilAMinuteAgo}"  -d devnet/Primary`

    await shell.exec(transferGroupLock, {async: false, silent: false})

    // transfer should go through
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    let localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(11)
})

test('can transfer between permitted account groups', async () => {
    let earliestPermittedTime = 1
    // from group 1 -> 1 is allowed
    let transferGroupLock1 =
        `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:setTransferRule' ` +
        `--app-arg "int:1" --app-arg "int:1" ` +
        `--app-arg "int:${earliestPermittedTime}"  -d devnet/Primary`

    await shell.exec(transferGroupLock1, {async: false, silent: false})

    // from group 1 -> 2 is allowed
    let transferGroupLock2 =
        `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:setTransferRule' ` +
        `--app-arg "int:1" --app-arg "int:2" ` +
        `--app-arg "int:${earliestPermittedTime}"  -d devnet/Primary`

    await shell.exec(transferGroupLock2, {async: false, silent: false})

    //transfer
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // check first receiver got tokens
    let receiverState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(receiverState["balance"]["ui"]).toEqual(11)

    // second receiver opts in to the app
    await util.optInApp(clientV2, accounts[2], appId)

    // put second receiver in group 2
    appArgs = [EncodeBytes("setAddressPermissions"), EncodeUint('0'), EncodeUint('0'), EncodeUint('0'), EncodeUint('2')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [accounts[2].addr])

    let localState = await util.readLocalState(clientV2, accounts[2], appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)
    expect(localState["transferGroup"]["ui"].toString()).toEqual('2')

    //transfer from first receiver to second receiver (group 1 -> 2)
    appArgs = [EncodeBytes("transfer"), EncodeUint('7')]
    await util.appCall(clientV2, receiverAccount, appId, appArgs, [accounts[2].addr])

    // check second receiver got tokens
    localState = await util.readLocalState(clientV2, accounts[2], appId)
    expect(localState["balance"]["ui"]).toEqual(7)

    // first account no longer has the transferred tokens
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(4)
})

test('transferRule allowing transfer from group 1 to 2 does not allow transfers from 2 to 1 (the reverse rule)', async () => {
    let earliestPermittedTime = 1

    // from group 1 -> 2 is allowed
    let transferGroupLock2 =
        `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:setTransferRule' ` +
        `--app-arg "int:1" --app-arg "int:2" ` +
        `--app-arg "int:${earliestPermittedTime}"  -d devnet/Primary`

    await shell.exec(transferGroupLock2, {async: false, silent: false})

    // put receiver in group 2
    appArgs = [EncodeBytes("setAddressPermissions"), EncodeUint('0'), EncodeUint('0'), EncodeUint('0'), EncodeUint('2')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    let localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)
    expect(localState["transferGroup"]["ui"].toString()).toEqual('2')

    //transfer to receiver (group 1 -> 2)
    appArgs = [EncodeBytes("transfer"), EncodeUint('7')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // check receiver got tokens
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(7)

    // first sender adminAccount no longer has the transferred tokens
    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(20)

    // transfer back from receiver account (group 2 -> 1) FAILS!
    let error = null
    try {
        appArgs = [EncodeBytes("transfer"), EncodeUint('7')]
        await util.appCall(clientV2, receiverAccount, appId, appArgs, [adminAccount.addr])
    } catch(e) {
        error = e
    }
    expect(error.message).toBe("Bad Request")

    //balances remain unchanged before and after the failed transfer
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(7)

    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(20)
})