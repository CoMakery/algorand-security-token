#!/usr/bin/env node
// usage:
// bin/check-state-purestake.js --asset 13167477

const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

require('dotenv').config()
const util = require('../lib/algoUtil')

const assetIndex = parseInt(argv.asset)
const algosdk = require('algosdk')
const baseServer = process.env.BASE_SERVER
const port = ""
const apiKey = process.env.PURESTAKE_API_KEY
const mnemonic = process.env.PRIVATE_SEED

const token = {
    'X-API-key': apiKey,
}
let algodClient = new algosdk.Algodv2(token, baseServer, port);


(async () => {
    var recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic);
    console.log('local state for account ', recoveredAccount.addr, 'asset ', assetIndex)
    console.log(await util.readLocalState(algodClient, recoveredAccount, assetIndex))

    console.log('global state for asset ', assetIndex)
    console.log(await util.readGlobalState(algodClient, recoveredAccount, assetIndex))
})().catch(e => {
    console.log(e)
})