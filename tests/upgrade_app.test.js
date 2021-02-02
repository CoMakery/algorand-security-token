require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
const {EncodeUint, EncodeBytes} = util
const algosdk = require('algosdk')

const server = "http://127.0.0.1"
const port = 8080

var adminAccount, newAccount, token, clientV2, appId

beforeEach(async () => {
    await privateTestNetSetup(appId)
    adminAccount = accounts[0]
    newAccount = accounts[1]

    token = await shell.cat(`devnet/Primary/algod.token`).stdout
    clientV2 = new algosdk.Algodv2(token, server, port)
})

test("admin can upgrade the app while maintaining the global and local state", async () => {
    let info = await util.deploySecurityToken(clientV2, adminAccount)
    appId = info.appId
    console.log('Create app: ', appId, adminAccount.addr)

    await util.optInApp(clientV2, newAccount, appId)

    let appArgs = [EncodeBytes("mint"), EncodeUint('27')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [newAccount.addr])
    localState = await util.readLocalState(clientV2, newAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(27)

    await util.upgradeSecurityToken(clientV2, adminAccount, appId)

    // mint 1 more token after upgrade
    appArgs = [EncodeBytes("mint"), EncodeUint('1')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [newAccount.addr])
    localState = await util.readLocalState(clientV2, newAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(28)

    // call a new function in the upgraded contract
    // that writes version 2 to global and receiver account state
    let setV2FlagFromUpgradedContract =
        `goal app call --app-id ${appId} --app-arg 'str:setversion' ` +
        `--from ${adminAccount.addr} --app-account ${newAccount.addr} -d devnet/Primary`
    console.log(setV2FlagFromUpgradedContract)
    await shell.exec(setV2FlagFromUpgradedContract, {async: false, silent: false})

    // global state is still present
    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['reserve']["ui"].toString()).toEqual('79999999999999972')
    expect(globalState["version"]["ui"]).toEqual(2)
    expect(globalState['cap']["ui"].toString()).toEqual('80000000000000000')

    //check local state has not been altered
    localState = await util.readLocalState(clientV2, newAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(28)
    expect(localState["transferGroup"]["ui"]).toEqual(1)
    expect(localState["local-version"]["ui"]).toEqual(2)
})

test("non admin cannot upgrade", async () => {
    let info = await util.deploySecurityToken(clientV2, adminAccount)
    appId = info.appId
    console.log('Create app: ', appId, adminAccount.addr)

    await util.optInApp(clientV2, newAccount, appId)

    let appArgs = [EncodeBytes("mint"), EncodeUint('27')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [newAccount.addr])
    localState = await util.readLocalState(clientV2, newAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(27)

    let error = null
    try {
        await util.upgradeSecurityToken(clientV2, newAccount, appId)
    } catch (e) {
       error = e
    }

    expect(error.message).toBe("Bad Request")
})