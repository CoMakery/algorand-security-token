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
    clientV2 = new algosdk.Algodv2(token, server, port)
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

test('can transfer between accounts', async () => {
    //transfer
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // check first receiver got tokens
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["uint"]).toEqual(11)

    // second receiver opts in to the app
    await util.optInApp(clientV2, accounts[2], appId)

    //transfer from first receiver to second receiver
    appArgs = [EncodeBytes("transfer"), EncodeUint('7')]
    await util.appCall(clientV2, receiverAccount, appId, appArgs, [accounts[2].addr])

    // check second receiver got tokens
    localState = await util.readLocalState(clientV2, accounts[2], appId)
    expect(localState["balance"]["uint"]).toEqual(7)

    // first account no longer has the transferred tokens
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["uint"]).toEqual(4)
})

test('admin can burn from any account', async () => {
    //transfer
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    //burn tokens
    appArgs = [EncodeBytes("burn"), EncodeUint('7')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // receiver account has had their token burned
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["uint"]).toEqual(4)

    // check burned tokens go back to the reserve
    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['reserve']['uint'].toString()).toEqual('79999999999999980')

    // check global supply is the same
    expect(globalState['total supply']['uint'].toString()).toBe('80000000000000000')
})

test('pausing contract stops transfers', async () => {
    //pause all transfers
    appArgs = [EncodeBytes("pause"), EncodeUint('1')]
    await util.appCall(clientV2, adminAccount, appId, appArgs)

    //transfer
    let transferBlocked = false
    try {
        appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
        await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])
    } catch (e) {
        transferBlocked = true
    }
    expect(transferBlocked).toEqual(true)
    // check receiver did not get tokens
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["uint"]).toEqual(0)

    // check sender has same amount of tokens
    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["balance"]["uint"]).toEqual(27)
})

test('unpausing contract enables transfers again', async () => {
    //pause
    appArgs = [EncodeBytes("pause"), EncodeUint('1')]
    await util.appCall(clientV2, adminAccount, appId, appArgs)

    //unpause
    appArgs = [EncodeBytes("pause"), EncodeUint('0')]
    await util.appCall(clientV2, adminAccount, appId, appArgs)

    //transfer
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // check receiver did not get tokens
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["uint"]).toEqual(11)

    // check sender has same amount of tokens
    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["balance"]["uint"]).toEqual(16)
})


//TODO: verify only approved account can upgrade
//TODO: verify only approved account can delete
//TODO: add vettingsAdmin