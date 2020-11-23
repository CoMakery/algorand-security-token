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

    localState = await util.readLocalState(clientV2, accounts[2], appId)
    expect(localState["contract admin"]["ui"]).toEqual(1)
})

test('contract admin can revoke the original contract admin role', async () => {
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
        EncodeUint('0')
    ]

    await util.appCall(clientV2, receiverAccount, appId, appArgs, [adminAccount.addr])
    localState = await util.readLocalState(clientV2, adminAccount, appId)
    expect(localState["contract admin"]["ui"]).toEqual(undefined)

    // original admin tries to revoke 2nd admins rights but no longer has that privilege
    appArgs = [
        EncodeBytes("set admin"),
        EncodeBytes("contract admin"),
        EncodeUint('0')
    ]

    let revokedAdminLostAbilityToGrantAdminRole = false
    try {
        await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])
    } catch (e) {
        revokedAdminLostAbilityToGrantAdminRole = true
    }
    expect(revokedAdminLostAbilityToGrantAdminRole).toEqual(true)
})

test('contract admin can grant transfer admin role but they cannot grant it to someone else', async () => {
    appArgs = [
        EncodeBytes("set admin"),
        EncodeBytes("transfer admin"),
        EncodeUint('1')
    ]

    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["transfer admin"]["ui"]).toEqual(1)

    // transfer admin can't grant transfer admin role
    await util.optInApp(clientV2, accounts[2], appId)
    appArgs = [
        EncodeBytes("set admin"),
        EncodeBytes("transfer admin"),
        EncodeUint('1')
    ]

    try {
        await util.appCall(clientV2, receiverAccount, appId, appArgs, [accounts[2].addr])
    } catch (e) {

    }
    localState = await util.readLocalState(clientV2, accounts[2], appId)
    expect(localState["transfer admin"]).toEqual(undefined)
})