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

test('admin can setAddressPermissions', async () => {
    // call
    appArgs = [EncodeBytes("setAddressPermissions"), EncodeUint('1'), EncodeUint('199'), EncodeUint('1610126036'), EncodeUint('7')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // account transfer restrictions has been updated
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["frozen"]["ui"]).toEqual(1)
    expect(localState["maxBalance"]["ui"]).toEqual(199)
    expect(localState["lockUntil"]["ui"]).toEqual(1610126036)
    expect(localState["transferGroup"]["ui"]).toEqual(7)
})

test('admin setAddressPermissions can be set', async () => {
  // call
  appArgs = [EncodeBytes("setAddressPermissions"), EncodeUint('1'), EncodeUint('199'), EncodeUint('1610126036'), EncodeUint('7')]
  await util.appCall(clientV2, adminAccount, appId, appArgs, [adminAccount.addr])

  // account transfer restrictions has been updated
  localState = await util.readLocalState(clientV2, adminAccount, appId)
  expect(localState["frozen"]["ui"]).toEqual(1)
  expect(localState["maxBalance"]["ui"]).toEqual(199)
  expect(localState["lockUntil"]["ui"]).toEqual(1610126036)
  expect(localState["transferGroup"]["ui"]).toEqual(7)
})