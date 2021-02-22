#!/usr/bin/env node
require('dotenv').config()
const algosdk = require('algosdk')
const util = require('../lib/algoUtil')
const JSONbig = require('json-bigint')

const baseServer = process.env.BASE_SERVER
const port = ""
const mnemonic = process.env.PRIVATE_SEED
const apiKey = process.env.PURESTAKE_API_KEY
const token = {
        'X-API-key' : apiKey,
    }

;(async() => {
    let algodClient = new algosdk.Algodv2(token, baseServer, port);
    var deployerAccount = algosdk.mnemonicToSecretKey(mnemonic)

    await util.setTransferRule(
        algodClient,
        deployerAccount,
        appId,
        fromGroupId,
        toGroupId,
        earliestPermittedTime)

    // set contract admins
    // await util.grantRoles(clientV2, appId, adminAccount, receiverAccount, 8)

    // set reserve admins
    // set transfer rule admins
    // set wallet admins
    // set hot wallet permissions
})().catch(e => {
    console.log(e)
})