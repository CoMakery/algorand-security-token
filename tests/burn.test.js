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

    //mint
    appArgs = [EncodeBytes("mint"), EncodeUint('27')]
    await util.appCall(clientV2, adminAccount, info.appId, appArgs, [adminAccount.addr])

    //opt in
    await util.optInApp(clientV2, receiverAccount, appId)

    let earliestPermittedTime = 1
    // from group 1 -> 1 is allowed
    let transferGroupLock1 =
        `goal app call --app-id ${appId} --from ${adminAccount.addr} ` +
        `--app-arg 'str:setAllowGroupTransfer' ` +
        `--app-arg "int:1" --app-arg "int:1" ` +
        `--app-arg "int:${earliestPermittedTime}"  -d devnet/Primary`

    await shell.exec(transferGroupLock1, {async: false, silent: false})
})

test('admin can burn from any account', async () => {
    //transfer
    appArgs = [EncodeBytes("transfer"), EncodeUint('11')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    //burn tokens
    appArgs = [EncodeBytes("burn"), EncodeUint('7')]
    await util.appCall(clientV2, adminAccount, appId, appArgs, [receiverAccount.addr])

    // receiver account has had their token burned
    localState = await util.readLocalState(clientV2, receiverAccount, appId)
    expect(localState["balance"]["ui"]).toEqual(4)

    // check burned tokens go back to the reserve
    globalState = await util.readGlobalState(clientV2, adminAccount, appId)
    expect(globalState['reserve']['ui'].toString()).toEqual('79999999999999980')

    // check global supply is the same
    expect(globalState['cap']['ui'].toString()).toBe('80000000000000000')
})