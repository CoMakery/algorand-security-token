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

it('mints when receiver maxBalance is not set', async () => {
  appArgs = [EncodeBytes("mint"), EncodeUint('27')]
  await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])
  localState = await util.readLocalState(clientV2, receiverAccount, appId)
  expect(localState["balance"]["ui"]).toEqual(27)
})

it('mints when receiver maxBalance is below balance after mint', async () => {
  appArgs = [EncodeBytes("setAddressPermissions"), EncodeUint('0'), EncodeUint('50'), EncodeUint('0'), EncodeUint('1')]
  await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

  appArgs = [EncodeBytes("mint"), EncodeUint('27')]
  await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])
  localState = await util.readLocalState(clientV2, receiverAccount, appId)
  expect(localState["balance"]["ui"]).toEqual(27)
})

it('does not mint when receiver maxBalance is above balance after mint', async () => {
  appArgs = [EncodeBytes("setAddressPermissions"), EncodeUint('0'), EncodeUint('50'), EncodeUint('0'), EncodeUint('1')]
  await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])
  
  appArgs = [EncodeBytes("mint"), EncodeUint('57')]
  try {
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])
  } catch (error) {
    expect(error.message).toEqual("Bad Request")
  }

  localState = await util.readLocalState(clientV2, receiverAccount, appId)
  expect(localState["balance"]["ui"]).toEqual(undefined)
})