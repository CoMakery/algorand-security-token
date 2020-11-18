#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const algosdk = require('algosdk')
const baseServer = process.env.BASE_SERVER
const port = ""
const mnemonic = process.env.PRIVATE_SEED
const numberOfTokens = '1000'

const token = {
    'X-API-key' : apiKey,
}

let algodClient = new algosdk.Algodv2(token, baseServer, port)

const waitForConfirmation = async function (algodclient, txId) {
    let status = (await algodclient.status().do())
    let lastRound = status["last-round"]
    while (true) {
        const pendingInfo = await algodclient.pendingTransactionInformation(txId).do()
        if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
            console.log("Transaction " + txId + " confirmed in round " + pendingInfo["confirmed-round"])
            break
        }
        lastRound++
        await algodclient.statusAfterBlock(lastRound).do()
    }
}

async function compileProgram(client, programPath) {
    let encoder = new TextEncoder()
    let programSource = fs.readFileSync(programPath, 'utf8')
    let programBytes = encoder.encode(programSource)
    let compileResponse = await client.compile(programBytes).do()
    return new Uint8Array(Buffer.from(compileResponse.result, "base64"))
}

(async() => {
    let params = await algodClient.getTransactionParams().do()
    params.fee = 1000
    params.flatFee = true

    var recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic)

    let sender = recoveredAccount.addr
    let onComplete =  algosdk.OnApplicationComplete.OptInOC
    let approvalProgram = await compileProgram(algodClient,'./security_token_approval.teal')
    let clearProgram = await compileProgram(algodClient, './security_token_clear_state.teal')
    let localInts = 3
    let localBytes = 0
    let globalInts = 3
    let globalBytes = 0
    let appArgs = []
    let arg1 = new Uint8Array(Buffer.from(numberOfTokens))
    appArgs.push(arg1)

    let txn = algosdk.makeApplicationCreateTxn(sender, params, onComplete,
        approvalProgram, clearProgram,
        localInts, localBytes, globalInts, globalBytes, appArgs)
    let signedTxn = algosdk.signTransaction(txn, recoveredAccount.sk)
    let sendTx = await algodClient.sendRawTransaction(signedTxn.blob).do()
    console.log("Transaction : ", sendTx)

    await waitForConfirmation(algodClient, sendTx.txId)

    let transactionResponse = await algodClient.pendingTransactionInformation(sendTx.txId).do()
    console.log("Created new app-id: ", transactionResponse)
    let appId = transactionResponse['application-index']
    console.log("Created new app-id: ", appId)
})().catch(e => {
    console.log(e)
})