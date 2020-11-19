#!/usr/bin/env node
require('dotenv').config()

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
    var recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic);
    let accountInfoResponse = await client.accountInformation(recoveredAccount.addr).do()
    console.log(accountInfoResponse)
})()
