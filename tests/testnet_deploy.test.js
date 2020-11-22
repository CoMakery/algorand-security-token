require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
const {EncodeUint, EncodeBytes} = util
const algosdk = require('algosdk')

const server = "http://127.0.0.1"
const port = 8080

var adminAccount, token, clientV2

beforeAll(async () => {
    await privateTestNetSetup()
    adminAccount = accounts[0]
    token = await shell.cat(`devnet/Primary/algod.token`).stdout
    clientV2 =  new algosdk.Algodv2(token, server, port)
})

test('test initial deployment state', async () => {
    //TODO: can pass in total, decimals, unitname
    let info = await util.deploySecurityToken(clientV2, adminAccount)
    let localState = await util.readLocalState(clientV2, adminAccount, info.appId)
    expect(localState["balance"]["uint"]).toEqual(0)
    expect(localState["contract admin"]["uint"]).toEqual(1) // TODO: rename to contractAdmin
    expect(localState["transfer admin"]["uint"]).toEqual(1) // TODO: rename to transferAdmin
    //TODO: add vettingsAdmin

    let globalState = await util.readGlobalState(clientV2, adminAccount, info.appId)
    expect(globalState['paused']['uint']).toEqual(0)
    expect(globalState['reserve']['uint']).toEqual(80000000000000000)
    expect(globalState['total supply']['uint']).toEqual(80000000000000000) // TODO: rename to total
    expect(globalState['decimals']['uint']).toEqual(8)
    expect(globalState['unitname']['bytes']).toEqual("ABCTEST")
})

test('mint, opt in and transfer', async () => {
    let info = await util.deploySecurityToken(clientV2, adminAccount)

    //mint
    appArgs = [EncodeBytes("mint"), EncodeUint('27')]
    await util.appCall(clientV2, adminAccount, info.appId, appArgs, [adminAccount.addr])

    // check minting result
    let localState = await util.readLocalState(clientV2, adminAccount, info.appId)
    expect(localState["balance"]["uint"]).toEqual(27)

    globalState = await util.readGlobalState(clientV2, adminAccount, info.appId)
    expect(globalState['total supply']['uint']).toEqual(80000000000000000)
    expect(globalState['reserve']['uint']).toEqual(79999999999999973)

    //opt in
    let receiverAccount = accounts[1]
    await util.optInApp(clientV2, receiverAccount, info.appId)
    localState = await util.readLocalState(clientV2, receiverAccount, info.appId)
    expect(localState["balance"]["uint"]).toEqual(0)
    expect(localState["contract admin"]).toEqual(undefined)
    expect(localState["transfer admin"]).toEqual(undefined)

    //transfer
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, info.appId, appArgs, [receiverAccount.addr])

    // check receiver got tokens
    localState = await util.readLocalState(clientV2, receiverAccount, info.appId)
    expect(localState["balance"]["uint"]).toEqual(11)

    // check sender has less tokens
    localState = await util.readLocalState(clientV2, adminAccount, info.appId)
    expect(localState["balance"]["uint"]).toEqual(16)

    // check global supply is same
    globalState = await util.readGlobalState(clientV2, adminAccount, info.appId)
    expect(globalState['total supply']['uint']).toEqual(80000000000000000)
    expect(globalState['reserve']['uint']).toEqual(79999999999999973)
})


//TODO: verify only approved account can upgrade
//TODO: verify only approved account can delete
//TODO: add vettingsAdmin
