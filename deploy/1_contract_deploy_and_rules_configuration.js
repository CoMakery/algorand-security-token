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

    let info = await util.deploySecurityToken(algodClient, deployerAccount)
    console.log(info)
    let appId = info.appId
    let fromGroupId = 1
    let toGroupId = 1
    let earliestPermittedTime = 1

    await util.setTransferRule(
        algodClient,
        deployerAccount,
        appId,
        fromGroupId,
        toGroupId,
        earliestPermittedTime)

    let application = await algodClient.getApplicationByID(appId).do()
    let globalState = application['params']['global-state']
    console.log(util.decodeState(globalState))
})().catch(e => {
    console.log(e)
})