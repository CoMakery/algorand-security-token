require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
const algosdk = require('algosdk')

const server = "http://127.0.0.1"
const port = 8080

var adminAccount, newAccount, token, clientV2, appId

beforeAll(async () => {
    await privateTestNetSetup()
    adminAccount = accounts[0]
    newAccount = accounts[1]

    token = await shell.cat(`devnet/Primary/algod.token`).stdout
    clientV2 = new algosdk.Algodv2(token, server, port)
})

test("admin can set the transfer group", async () => {
    let {appId} = await util.deploySecurityToken(clientV2, adminAccount)

    //opt in
    await util.optInApp(clientV2, newAccount, appId)

    let groupId = 2
    let transferGroupSet = `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:transfer group' --app-arg 'str:set' ` +
        `--app-arg "int:${groupId}" --app-account ${newAccount.addr} -d devnet/Primary`

    console.log(transferGroupSet)
    await shell.exec(transferGroupSet, {async: false, silent: false})

    let localState = await util.readLocalState(clientV2, newAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(undefined)
    expect(localState["transfer group"]["ui"].toString()).toEqual('2')
})