require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
const algosdk = require('algosdk')

test('testnet deploy', async () => {
    await privateTestNetSetup()
    let recoveredAccount = accounts[0]
    let token = await shell.cat(`devnet/Primary/algod.token`).stdout
    const server = "http://127.0.0.1"
    const port = 8080
    let clientV2 =  new algosdk.Algodv2(token, server, port)
    let info = await util.deploySecurityToken(clientV2, recoveredAccount)
    let localState = await util.readLocalState(clientV2, recoveredAccount, info.appId)
    expect(localState["balance"]["uint"]).toEqual(0)
    expect(localState["contract admin"]["uint"]).toEqual(1)
    expect(localState["transfer admin"]["uint"]).toEqual(1)

    let globalState = await util.readGlobalState(clientV2, recoveredAccount, info.appId)
    expect(globalState['paused']['uint']).toEqual(0)
    expect(globalState['reserve']['uint']).toEqual(80000000000000000)
    expect(globalState['total supply']['uint']).toEqual(80000000000000000)
})