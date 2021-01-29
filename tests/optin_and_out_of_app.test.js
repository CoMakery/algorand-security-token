require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
const {EncodeUint, EncodeBytes} = util
const algosdk = require('algosdk')

const server = "http://127.0.0.1"
const port = 8080

var adminAccount, newAccount, token, clientV2, appId

beforeEach(async () => {
    await privateTestNetSetup(appId)
    adminAccount = accounts[0]
    newAccount = accounts[1]

    token = await shell.cat(`devnet/Primary/algod.token`).stdout
    clientV2 = new algosdk.Algodv2(token, server, port)
})

test("can opt in and when I opt out my balance is returned to the reserve", async () => {
    let info = await util.deploySecurityToken(clientV2, adminAccount)
    appId = info.appId
    console.log(appId, adminAccount.addr)

    //opt in
    await util.optInApp(clientV2, newAccount, appId)

    //check state
    let localState = await util.readLocalState(clientV2, newAccount, info.appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)
    expect(localState["transfer group"]["ui"]).toEqual(1)
})

test("do not allow an account that has opted in to opt out / delete app", async () => {
    let info = await util.deploySecurityToken(clientV2, adminAccount)
    appId = info.appId
    console.log(appId, adminAccount.addr)

    await util.optInApp(clientV2, newAccount, appId)

    let attemptOptOut = `goal app closeout --app-id ${appId} --from ${adminAccount.addr} -d devnet/Primary`

    let response = await shell.exec(attemptOptOut, {async: false, silent: false})
    expect(response.stderr).toMatch(/transaction rejected by ApprovalProgram/)
    //check state has not been altered
    let localState = await util.readLocalState(clientV2, newAccount, info.appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)
    expect(localState["transfer group"]["ui"]).toEqual(1)

})