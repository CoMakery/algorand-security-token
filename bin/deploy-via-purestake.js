#!/usr/bin/env node
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
    var recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic)

    let info = await util.deploySecurityToken(algodClient, recoveredAccount)
    console.log(info)
})().catch(e => {
    console.log(e)
})