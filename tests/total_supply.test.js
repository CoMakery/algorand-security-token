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

    //opt in
    await util.optInApp(clientV2, receiverAccount, appId)
})

it('should have a starting totalSupply of undefined / 0', async function () {
    let globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['totalSupply']["ui"]).toEqual(undefined)
})

it('minting and burning updates the total supply', async () => {
    let appArgs = [EncodeBytes("mint"), EncodeUint('27')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    let localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(27)

    let globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['totalSupply']["ui"]).toEqual(27)

    appArgs = [EncodeBytes("burn"), EncodeUint('7')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(20)

    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['totalSupply']["ui"]).toEqual(20)
})

// transfer does not update
// failed mint does not update
// failed burn does not update