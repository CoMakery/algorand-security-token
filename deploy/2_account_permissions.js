#!/usr/bin/env node
// This script can only be run after the admin, sub reserve and hot wallet accounts
// have opted in to the algorand application.


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

    // check all accounts to be configured have opted in to the application

    // set contract admins
    // await util.grantRoles(clientV2, appId, adminAccount, receiverAccount, 8)

    // set reserve admins
    // set transfer rule admins
    // set wallet admins

    // set sub reserve permissions
    // await util.setAddressPermissions(clientV2, appId, adminAccount, receiverAccount, 1, 199,1610126036, 7)

    // set hot wallet permissions
})().catch(e => {
    console.log(e)
})