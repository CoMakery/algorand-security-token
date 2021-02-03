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

test('#detect can check whether a simple transfer would complete (without transferring tokens)', async () => {
    let fromGroupId = 1
    let toGroupId = 1
    let earliestPermittedTime = 1

    let setTransferRule =
        `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:setTransferRule' ` +
        `--app-arg "int:${fromGroupId}" --app-arg "int:${toGroupId}" ` +
        `--app-arg "int:${earliestPermittedTime}"  -d devnet/Primary`

    await shell.exec(setTransferRule, {async: false, silent: false})

    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['reserve']['ui'].toString()).toEqual('79999999999999973')

    //transfer
    appArgs = [EncodeBytes("detect"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [adminAccount.addr, receiverAccount.addr])

    // check receiver received no tokens
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)

    // check sender has the same number of tokens
    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(27)

    // check global supply is same
    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['cap']['ui'].toString()).toEqual('80000000000000000')
    expect(globalState['reserve']['ui'].toString()).toEqual('79999999999999973')
})

test('#detect confirms you can transfer to an account if the transfer rule lock has expired', async () => {
    let fromGroupId = 1
    let toGroupId = 1
    let lockUntilAMinuteAgo = Math.floor(new Date().getTime() / 1000) - 60

    let setTransferRule =
        `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:setTransferRule' ` +
        `--app-arg "int:${fromGroupId}" --app-arg "int:${toGroupId}" ` +
        `--app-arg "int:${lockUntilAMinuteAgo}"  -d devnet/Primary`

    await shell.exec(setTransferRule, {async: false, silent: false})

    // detect confirms the transfer (by not failing)
    appArgs = [EncodeBytes("detect"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [adminAccount.addr, receiverAccount.addr])

    // but no tokens are transferred after the confirmation
    let localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)
})

test('#detect also shows that you cannot transfer by default', async () => {
    try {
        appArgs = [EncodeBytes("detect"), EncodeUint('11')]
        await util.appCall(clientV2, adminAccount, appId, appArgs, [adminAccount.addr, receiverAccount.addr])
    } catch (e) {
        expect(e.message).toEqual("Bad Request")
    }
    // check receiver got no tokens
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)
})