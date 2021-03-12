#!/usr/bin/env node
require('dotenv').config()

const algosdk = require('algosdk')
const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')

const baseServer = process.env.BASE_SERVER
const port = ""
const apiKey = process.env.PURESTAKE_API_KEY
const mnemonic = process.env.PRIVATE_SEED

const args = yargs(hideBin(process.argv))
    .option('address', {
        description: 'the the address to get info for',
        string: true
    }).argv

const token = {
    'X-API-key': apiKey,
}

if(args.address == undefined) {
    var recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic)
    args.address = recoveredAccount.addr
}

let client = new algosdk.Algodv2(token, baseServer, port);

(async () => {
    let accountInfoResponse = await client.accountInformation(args.address).do()
    console.log(accountInfoResponse)
})()
