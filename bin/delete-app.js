#!/usr/bin/env node
// usage:
// bin/delete-app.js --asset 13167477

const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const assetIndex = parseInt(argv.asset)

require('dotenv').config()
const util = require('../lib/algoUtil')

const algosdk = require('algosdk')
const baseServer = process.env.BASE_SERVER
const port = ""
const apiKey = process.env.PURESTAKE_API_KEY
const mnemonic = process.env.PRIVATE_SEED

const token = {
    'X-API-key': apiKey,
}

let client = new algosdk.Algodv2(token, baseServer, port);

(async () => {
    let params = await client.getTransactionParams().do()
    params.fee = 1000
    params.flatFee = true

    var recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic)

    let txn = algosdk.makeApplicationDeleteTxn(recoveredAccount.addr, params, assetIndex)
    let txId = txn.txID().toString();
    let signedTxn = txn.signTxn(recoveredAccount.sk);
    console.log("Signed transaction with txID: %s", txId);
    await client.sendRawTransaction(signedTxn).do();
    await util.waitForConfirmation(client, txId);

    txn = algosdk.makeApplicationClearStateTxn(recoveredAccount.addr, params, assetIndex)

    txId = txn.txID().toString();
    signedTxn = txn.signTxn(recoveredAccount.sk);
    console.log("Signed transaction with txID: %s", txId);
    await client.sendRawTransaction(signedTxn).do();
    await util.waitForConfirmation(client, txId);

    let transactionResponse = await client.pendingTransactionInformation(txId).do();
    let appId = transactionResponse['txn']['txn'].apid;

    console.log("Deleted app-id: ",appId);
    let accountInfoResponse = await client.accountInformation(recoveredAccount.addr).do()
    console.log(accountInfoResponse)
})()
