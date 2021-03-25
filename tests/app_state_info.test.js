require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
const algosdk = require('algosdk')

const server = "http://127.0.0.1"
const port = 8080

var adminAccount, token, config, appInfo, client

beforeAll(async () => {
    await privateTestNetSetup()
    adminAccount = accounts[0]
    token = await shell.cat(`devnet/Primary/algod.token`).stdout
    client = await new algosdk.Algodv2(token, server, port)
})

test('checkAccountConfig returns data for an opted in account', async () => {
    let appInfo = await util.deploySecurityToken(client, adminAccount)
    config = {
        client: client,
        appId: appInfo.appId
    }
    let accountInfo = await util.checkAccountConfig("Address title", adminAccount.addr, config)
    console.log(accountInfo)
    expect(accountInfo.name).toEqual('Address title')
    expect(accountInfo.address).toEqual(adminAccount.addr)
    expect(accountInfo.optedIn).toEqual(true)
    expect(accountInfo.ready).toEqual(true)
    expect(accountInfo.roles).toEqual(15)
    expect(accountInfo.transferGroup).toEqual(undefined)
    expect(accountInfo.balance).toEqual(0)
})

test('checkAccountConfig returns data for a non existent app id', async () => {
    config = {
        client: client,
        appId: 1203981203981238
    }
    let accountInfo = await util.checkAccountConfig("Address title", adminAccount.addr, config)
    console.log(accountInfo)
    expect(accountInfo.name).toEqual('Address title')
    expect(accountInfo.address).toEqual(adminAccount.addr)
    expect(accountInfo.optedIn).toEqual(false)
    expect(accountInfo.ready).toEqual(false)
    expect(accountInfo.roles).toEqual(null)
    expect(accountInfo.transferGroup).toEqual(null)
    expect(accountInfo.balance).toEqual(null)
})

test('getGlobalAppState returns well formatted global app data', async () => {
    let tx = await util.deploySecurityToken(client, adminAccount)
    config = { client: client, appId: tx.appId }
    let appInfo = await util.getGlobalAppState(config)
    console.log(appInfo)
    expect(appInfo.symbol).toEqual('ABCTEST')
    expect(appInfo.name).toEqual("The XYZ Test Token")
    expect(appInfo.paused).toEqual(0)
    expect(appInfo.reserve).toEqual(80000000000000000)
    expect(appInfo.cap).toEqual(80000000000000000)
    expect(appInfo.totalSupply).toEqual(0)
    expect(appInfo.decimals).toEqual(8)
})

test('getGlobalAppState returns null values for', async () => {
    config = { client: client, appId: 1239123912391239 }
    await expect(util.getGlobalAppState(config)).rejects.toThrowError('Not Found')
})