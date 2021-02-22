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

    // mint initial tokens needed for hot wallet distribution
    // await util.mint(clientV2, appId, adminAccount, receiverAccount, 27)

    // mint tokens to delegate accounts that can only transfer to the hot wallet
})().catch(e => {
    console.log(e)
})