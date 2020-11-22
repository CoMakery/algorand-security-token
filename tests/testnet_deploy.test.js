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
    //TODO: can pass in total, decimals, unitname
    let info = await util.deploySecurityToken(clientV2, adminAccount)
    let localState = await util.readLocalState(clientV2, adminAccount, info.appId)
    expect(localState["balance"]["uint"]).toEqual(0)
    expect(localState["contract admin"]["uint"].toString()).toEqual('1') // TODO: rename to contractAdmin
    expect(localState["transfer admin"]["uint"].toString()).toEqual('1') // TODO: rename to transferAdmin
    //TODO: add vettingsAdmin

    let globalState = await util.readGlobalState(clientV2, adminAccount, info.appId)
    expect(globalState['paused']['uint'].toString()).toEqual('0')
    expect(globalState['reserve']['uint'].toString()).toEqual('80000000000000000')
    expect(globalState['total supply']['uint'].toString()).toEqual('80000000000000000') // TODO: rename to total
    expect(globalState['decimals']['uint'].toString()).toEqual('8')
    expect(globalState['unitname']['bytes']).toEqual("ABCTEST")
})

test('test initial deployment args', async () => {
    //TODO: can pass in total, decimals, unitname
    let info = await util.deploySecurityToken(clientV2, adminAccount, 1234567, 7, "XYZ2")
    let localState = await util.readLocalState(clientV2, adminAccount, info.appId)
    expect(localState["balance"]["uint"]).toEqual(0)
    expect(localState["contract admin"]["uint"].toString()).toEqual('1') // TODO: rename to contractAdmin
    expect(localState["transfer admin"]["uint"].toString()).toEqual('1') // TODO: rename to transferAdmin
    //TODO: add vettingsAdmin

    let globalState = await util.readGlobalState(clientV2, adminAccount, info.appId)
    expect(globalState['paused']['uint'].toString()).toEqual('0')
    expect(globalState['reserve']['uint'].toString()).toEqual('1234567')
    expect(globalState['total supply']['uint'].toString()).toEqual('1234567') // TODO: rename to total
    expect(globalState['decimals']['uint'].toString()).toEqual('7')
    expect(globalState['unitname']['bytes']).toEqual("XYZ2")
})