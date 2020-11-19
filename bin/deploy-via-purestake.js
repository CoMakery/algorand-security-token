#!/usr/bin/env node
require('dotenv').config()

const algosdk = require('algosdk')
const baseServer = process.env.BASE_SERVER
const port = ""
const mnemonic = process.env.PRIVATE_SEED
const apiKey = process.env.PURESTAKE_API_KEY
const numberOfTokens = '1000'
const util = require('../lib/algoUtil')

const token = {
    'X-API-key' : apiKey,
}

let algodClient = new algosdk.Algodv2(token, baseServer, port);

(async() => {
    let params = await algodClient.getTransactionParams().do()
    params.fee = 1000
    params.flatFee = true

    var recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic)

    let sender = recoveredAccount.addr
    let onComplete =  algosdk.OnApplicationComplete.OptInOC
    let approvalProgram = await util.compileProgram(algodClient,'./security_token_approval.teal')
    let clearProgram = await util.compileProgram(algodClient, './security_token_clear_state.teal')
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

    await util.waitForConfirmation(algodClient, sendTx.txId)

    let transactionResponse = await algodClient.pendingTransactionInformation(sendTx.txId).do()
    let appId = transactionResponse['application-index']
    console.log("Created new app-id: ", appId)
})().catch(e => {
    console.log(e)
})