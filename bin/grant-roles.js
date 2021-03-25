#!/usr/bin/env node
// bin/grant-roles.js --app-id theAppId --to targetAddress --roles roleNumber
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
    .option('to', {
        description: 'the algorand address to grant roles to',
        string: true
    })
    .option('roles', {
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
    await util.grantRoles(client,  args.appId, adminFromAccount, args.to, args.roles)
    // let info = await util.deploySecurityToken(algodClient, recoveredAccount)
    // console.log(info)
})().catch(e => {
    console.log(e)
})