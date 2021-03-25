#!/usr/bin/env node
// bin/optin.js --app-id theAppId
require('dotenv').config()
const algosdk = require('algosdk')
const util = require('../lib/algoUtil')
const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')

const args = yargs(hideBin(process.argv))
    .option('app-id', {
        description: 'the id of the security token app to call',
        number: true
    })
    .argv

console.log(args)

const baseServer = process.env.BASE_SERVER
const port = ""
const mnemonic = process.env.PRIVATE_SEED
const apiKey = process.env.PURESTAKE_API_KEY
const token = {
        'X-API-key' : apiKey,
    }

;(async() => {
    let client = new algosdk.Algodv2(token, baseServer, port);
    var adminFromAccount = algosdk.mnemonicToSecretKey(mnemonic)
    await util.optInApp(client, adminFromAccount, args.appId)
})().catch(e => {
    console.log(e)
})