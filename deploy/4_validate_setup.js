#!/usr/bin/env node
// This script can only be run after the admin, sub reserve and hot wallet accounts
// have opted in to the algorand application. It is intended to be run after address permissioning.


require('dotenv').config()
const algosdk = require('algosdk')
const util = require('../lib/algoUtil')

const baseServer = process.env.BASE_SERVER
const port = ""
const mnemonic = process.env.PRIVATE_SEED
const apiKey = process.env.PURESTAKE_API_KEY
const token = {
        'X-API-key' : apiKey,
    }

;(async() => {
    let algodClient = new algosdk.Algodv2(token, baseServer, port);
    let deployerAccount = algosdk.mnemonicToSecretKey(mnemonic)

    // verify expected admin roles
    // verify expected hot wallet and sub reserve configuration
    // verify expected minted balances
    // verify transfer rule configuration
})().catch(e => {
    console.log(e)
})