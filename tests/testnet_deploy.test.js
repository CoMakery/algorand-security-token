require('dotenv').config()
const shell = require('shelljs')
const util = require('../lib/algoUtil')
const { TextEncoder } = require('util')
const algosdk = require('algosdk')

const server = "http://127.0.0.1"
const port = 8080

var recoveredAccount, token, clientV2

beforeAll(async () => {
    await privateTestNetSetup()
    recoveredAccount = accounts[0]
    token = await shell.cat(`devnet/Primary/algod.token`).stdout
    clientV2 =  new algosdk.Algodv2(token, server, port)
})

test('test initial deployment state', async () => {
    //TODO: can pass in total, decimals, unitname
    let info = await util.deploySecurityToken(clientV2, recoveredAccount)
    let localState = await util.readLocalState(clientV2, recoveredAccount, info.appId)
    expect(localState["balance"]["uint"]).toEqual(0)
    expect(localState["contract admin"]["uint"]).toEqual(1) // TODO: rename to contractAdmin
    expect(localState["transfer admin"]["uint"]).toEqual(1) // TODO: rename to transferAdmin
    //TODO: add vettingsAdmin

    let globalState = await util.readGlobalState(clientV2, recoveredAccount, info.appId)
    expect(globalState['paused']['uint']).toEqual(0)
    expect(globalState['reserve']['uint']).toEqual(80000000000000000)
    expect(globalState['total supply']['uint']).toEqual(80000000000000000) // TODO: rename to total
    expect(globalState['decimals']['uint']).toEqual(8)
    expect(globalState['unitname']['bytes']).toEqual("ABCTEST")
})

it('mint, opt in and transfer', async () => {
    let info = await util.deploySecurityToken(clientV2, recoveredAccount)

    //mint
    appArgs = [EncodeBytes("mint"), EncodeUint('27')]
    await appCall(recoveredAccount, info.appId, appArgs, [recoveredAccount.addr])

    localState = await util.readLocalState(clientV2, recoveredAccount, info.appId)
    expect(localState["balance"]["uint"]).toEqual(27)

    globalState = await util.readGlobalState(clientV2, recoveredAccount, info.appId)
    expect(globalState['total supply']['uint']).toEqual(80000000000000000)
    expect(globalState['reserve']['uint']).toEqual(79999999999999973)

    //opt in
    //transfer
})

async function appCall(sender, appId, appArgs, appAccounts) {
    let params = await clientV2.getTransactionParams().do()
    params.fee = 1000
    params.flatFee = true

    let txn = algosdk.makeApplicationNoOpTxn(sender.addr, params, appId, appArgs, appAccounts)
    let signedTxn = algosdk.signTransaction(txn, sender.sk)
    let sendTx = await clientV2.sendRawTransaction(signedTxn.blob).do()

    console.log("Transaction : ", sendTx)
    await util.waitForConfirmation(clientV2, sendTx.txId)
    let transactionResponse = await clientV2.pendingTransactionInformation(sendTx.txId).do()
    console.log(`transaction response: ${transactionResponse}`)
}

function EncodeBytes(utf8String) {
    let enc = new TextEncoder()
    return enc.encode(utf8String)
}

function EncodeUint(intOrString) {
    return util.bigIntToUint8Array(intOrString)
}


//TODO: verify only approved account can upgrade
//TODO: verify only approved account can delete
//TODO: add vettingsAdmin
