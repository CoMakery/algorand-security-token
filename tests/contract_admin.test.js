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

test('contract admin can grant contract admin role - which allows granting the contract admin role', async () => {
    // grant contract admin
    appArgs = [
        EncodeBytes("set admin"),
        EncodeBytes("contract admin"),
        EncodeUint('1')
    ]

    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["contract admin"]["ui"]).toEqual(1)

    // new contract admin grants contract admin to another new admin
    appArgs = [
        EncodeBytes("set admin"),
        EncodeBytes("contract admin"),
        EncodeUint('1')
    ]

    await util.optInApp(clientV2, accounts[2], appId)
    await util.appCall(clientV2, receiverAccount, appId, appArgs, [accounts[2].addr])

    // check receiver did not get tokens
    localState = await util.readLocalState(clientV2, accounts[2], appId)
    expect(localState["contract admin"]["ui"]).toEqual(1)
})