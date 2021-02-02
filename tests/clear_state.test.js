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
})

it('when a non admin account runs the clear state program their tokens are returned to the reserve even when they opt back in', async () => {
  let info = await util.deploySecurityToken(clientV2, adminAccount)
  appId = info.appId

  let globalState = await util.readGlobalState(clientV2, adminAccount, appId)
  expect(globalState['reserve']["ui"].toString()).toEqual('80000000000000000')
  expect(globalState['cap']["ui"].toString()).toEqual('80000000000000000')

  //opt in
  await util.optInApp(clientV2, receiverAccount, appId)

  appArgs = [EncodeBytes("mint"), EncodeUint('27')]

  await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])
  localState = await util.readLocalState(clientV2, receiverAccount, appId)
  expect(localState["balance"]["ui"]).toEqual(27)

  // tokens transferred from reserve to receiver
  globalState = await util.readGlobalState(clientV2, adminAccount, appId)
  expect(globalState['totalSupply']["ui"].toString()).toEqual('27')
  expect(globalState['reserve']["ui"].toString()).toEqual('79999999999999973')
  expect(globalState['cap']["ui"].toString()).toEqual('80000000000000000')

  // this also opts out the user
  await util.clearState(clientV2, receiverAccount, appId)

  // expect not opted in error
  let notOptedInError = null
  try {
    await util.readLocalState(clientV2, receiverAccount, appId)
  } catch (e) {
    notOptedInError = e
  }

  expect(notOptedInError.trim()).
    toBe(`${receiverAccount.addr} has not opted in to application ${appId}`)
  globalState = await util.readGlobalState(clientV2, adminAccount, appId)
  expect(globalState['reserve']["ui"].toString()).toEqual('80000000000000000')
  expect(globalState['cap']["ui"].toString()).toEqual('80000000000000000')
  expect(globalState['totalSupply']["ui"]).toEqual(undefined)

  // should be able to opt back in and have cleared opt in balance state
  await util.optInApp(clientV2, receiverAccount, appId)
  localState = await util.readLocalState(clientV2, receiverAccount, appId)
  expect(localState["balance"]["ui"]).toEqual(undefined)

  // the cap and reserve maintain the total balance from after the receiver account cleared its state
  globalState = await util.readGlobalState(clientV2, adminAccount, appId)
  expect(globalState['reserve']["ui"].toString()).toEqual('80000000000000000')
  expect(globalState['cap']["ui"].toString()).toEqual('80000000000000000')
  expect(globalState['totalSupply']["ui"]).toEqual(undefined)

})