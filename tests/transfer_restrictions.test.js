require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
const {EncodeUint, EncodeBytes} = util
const algosdk = require('algosdk')

const server = "http://127.0.0.1"
const port = 8080

var adminAccount, receiverAccount, token, clientV2, appId

beforeAll(async () => {
    await privateTestNetSetup()
    adminAccount = accounts[0]
    receiverAccount = accounts[1]

    token = await shell.cat(`devnet/Primary/algod.token`).stdout
    clientV2 =  new algosdk.Algodv2(token, server, port)
})

beforeEach(async () => {
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
    expect(localState["balance"]["uint"]).toEqual(27)

    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['total supply']['uint']).toEqual(80000000000000000)
    expect(globalState['reserve']['uint']).toEqual(79999999999999973)

    // recipient opted in
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["uint"]).toEqual(0)
    expect(localState["contract admin"]).toEqual(undefined)
    expect(localState["transfer admin"]).toEqual(undefined)
})

test('mint, opt in and transfer', async () => {
    //transfer
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // check receiver got tokens
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["uint"]).toEqual(11)

    // check sender has less tokens
    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["balance"]["uint"]).toEqual(16)

    // check global supply is same
    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['total supply']['uint']).toEqual(80000000000000000)
    expect(globalState['reserve']['uint']).toEqual(79999999999999973)
})



//TODO: verify only approved account can upgrade
//TODO: verify only approved account can delete
//TODO: add vettingsAdmin