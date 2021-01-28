require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
const {EncodeUint, EncodeBytes} = util
const algosdk = require('algosdk')
const { describe } = require('yargs')

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

  await util.optInApp(clientV2, receiverAccount, appId)
})

// describe('contract admin role', async () => {
  it('can be granted by contract admin', async () => {
    appArgs = [
      EncodeBytes("set permissions"),
      EncodeUint('8')
    ]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["permissions"]["ui"]).toEqual(8)

    expect(async () => await util.appCall(clientV2, receiverAccount, appId, appArgs, [receiverAccount.addr])).not.toThrow()
  })

  it('can be revoked by contract admin', async () => {
    appArgs = [
      EncodeBytes("set permissions"),
      EncodeUint('8')
    ]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    appArgs = [
      EncodeBytes("set permissions"),
      EncodeUint('0')
    ]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["permissions"]["ui"]).toEqual(undefined)
    
    appArgs = [
      EncodeBytes("set permissions"),
      EncodeUint('8')
    ]
    expect(async () => await util.appCall(clientV2, receiverAccount, appId, appArgs, [receiverAccount.addr])).toThrow()
    
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["permissions"]["ui"]).toEqual(1)
  })

  it('can not be revoked by contract admin from themselves', async () => {
    // TODO: Implement in contract
    expect(false).toBeFalsy
  })
// })

// describe('wallets admin role', async () => {
  test('can be granted by contract admin', async () => {
    appArgs = [
      EncodeBytes("set permissions"),
      EncodeUint('1')
    ]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["permissions"]["ui"]).toEqual(1)

    appArgs = [EncodeBytes("transfer restrictions"), EncodeUint('1'), EncodeUint('199'), EncodeUint('1610126036'), EncodeUint('7')]
    expect(async () => await util.appCall(clientV2, receiverAccount, appId, appArgs, [receiverAccount.addr])).not.toThrow()
  })

  test('can be revoked by contract admin', async () => {
    appArgs = [
      EncodeBytes("set permissions"),
      EncodeUint('1')
    ]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    appArgs = [
      EncodeBytes("set permissions"),
      EncodeUint('0')
    ]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["permissions"]["ui"]).toEqual(undefined)
    
    appArgs = [EncodeBytes("transfer restrictions"), EncodeUint('0'), EncodeUint('199'), EncodeUint('1610126036'), EncodeUint('7')]
    expect(async () => await util.appCall(clientV2, receiverAccount, appId, appArgs, [receiverAccount.addr])).toThrow()
  })
// })

// describe('transfer rules admin role', async () => {
  test('can be granted by contract admin', async () => {
    appArgs = [
      EncodeBytes("set permissions"),
      EncodeUint('2')
    ]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["permissions"]["ui"]).toEqual(2)

    appArgs = [EncodeBytes("transfer group"), EncodeBytes("lock"), EncodeUint('1'), EncodeUint('1'), EncodeUint('1610126036')]
    expect(async () => await util.appCall(clientV2, receiverAccount, appId, appArgs)).not.toThrow()
  })

  test('can be revoked by contract admin', async () => {
    appArgs = [
      EncodeBytes("set permissions"),
      EncodeUint('2')
    ]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    appArgs = [
      EncodeBytes("set permissions"),
      EncodeUint('0')
    ]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["permissions"]["ui"]).toEqual(undefined)
    
    appArgs = [EncodeBytes("transfer group"), EncodeBytes("lock"), EncodeUint('1'), EncodeUint('1'), EncodeUint('1610126036')]
    expect(async () => await util.appCall(clientV2, receiverAccount, appId, appArgs)).toThrow()
  })
// })

// describe('assets admin role', async () => {
  test('can be granted by contract admin', async () => {
    appArgs = [
      EncodeBytes("set permissions"),
      EncodeUint('4')
    ]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["permissions"]["ui"]).toEqual(4)

    appArgs = [EncodeBytes("transfer restrictions"), EncodeUint('0'), EncodeUint('199'), EncodeUint('1610126036'), EncodeUint('7')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    appArgs = [EncodeBytes("mint"), EncodeUint('27')]
    expect(async () => await util.appCall(clientV2, receiverAccount, appId, appArgs, [receiverAccount.addr])).not.toThrow()

    appArgs = [EncodeBytes("burn"), EncodeUint('27')]
    expect(async () => await util.appCall(clientV2, receiverAccount, appId, appArgs, [receiverAccount.addr])).not.toThrow()
  })

  test('can be revoked by contract admin', async () => {
    appArgs = [
      EncodeBytes("set permissions"),
      EncodeUint('4')
    ]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    appArgs = [
      EncodeBytes("set permissions"),
      EncodeUint('0')
    ]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["permissions"]["ui"]).toEqual(undefined)

    appArgs = [EncodeBytes("transfer restrictions"), EncodeUint('0'), EncodeUint('199'), EncodeUint('1610126036'), EncodeUint('7')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])
    
    appArgs = [EncodeBytes("mint"), EncodeUint('27')]
    expect(async () => await util.appCall(clientV2, receiverAccount, appId, appArgs, [receiverAccount.addr])).toThrow()

    appArgs = [EncodeBytes("burn"), EncodeUint('27')]
    expect(async () => await util.appCall(clientV2, receiverAccount, appId, appArgs, [receiverAccount.addr])).toThrow()
  })
// })