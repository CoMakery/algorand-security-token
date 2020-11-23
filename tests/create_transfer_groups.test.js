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

test("admin can restrict default account group from transferring to itself", async () => {
    let info = await util.deploySecurityToken(clientV2, adminAccount)
    appId = info.appId
    console.log(appId, adminAccount.addr)

    let fromGroupId = 1
    let toGroupId = 1
    let lockUntilUnixTimestampTomorrow = Math.floor(new Date().getTime() / 1000) + (60 * 60 * 24)

    let transferGroupLock =
        `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:transfer group' --app-arg 'str:lock' ` +
        `--app-arg "int:${fromGroupId}" --app-arg "int:${toGroupId}" ` +
        `--app-arg "int:${lockUntilUnixTimestampTomorrow}"  -d devnet/Primary`

    await shell.exec(transferGroupLock, {async: false, silent: false})
    let globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    let lockedTransferGroup = Object.keys(globalState).filter((key) => /rule/.test(key))[0]
    expect(globalState[lockedTransferGroup]['ui']).toEqual(lockUntilUnixTimestampTomorrow)
})