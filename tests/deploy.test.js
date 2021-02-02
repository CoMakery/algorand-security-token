require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
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
    let info = await util.deploySecurityToken(clientV2, adminAccount)
    let localState = await util.readLocalState(clientV2, adminAccount, info.appId)
    expect(localState["transferGroup"]["ui"].toString()).toEqual('1')
    expect(localState["balance"]["ui"]).toEqual(undefined)
    expect(localState["roles"]["ui"]).toEqual(15)

    let globalState = await util.readGlobalState(clientV2, adminAccount, info.appId)
    expect(globalState['paused']["ui"]).toEqual(undefined)
    expect(globalState['totalSupply']["ui"]).toEqual(undefined)
    expect(globalState['reserve']["ui"].toString()).toEqual('80000000000000000')
    expect(globalState['cap']["ui"].toString()).toEqual('80000000000000000')
    expect(globalState['decimals']["ui"].toString()).toEqual('8')
    expect(globalState['symbol']['tb']).toEqual("ABCTEST")
    expect(globalState['name']['tb']).toEqual("The XYZ Test Token")
})

test('test initial deployment args', async () => {
    let info = await util.deploySecurityToken(clientV2, adminAccount, 1234567, 7, "XYZ2")
    let globalState = await util.readGlobalState(clientV2, adminAccount, info.appId)
    expect(globalState['paused']["ui"]).toEqual(undefined)
    expect(globalState['reserve']["ui"].toString()).toEqual('1234567')
    expect(globalState['cap']["ui"].toString()).toEqual('1234567')
    expect(globalState['decimals']["ui"].toString()).toEqual('7')
    expect(globalState['symbol']['tb']).toEqual("XYZ2")
})