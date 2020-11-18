#!/usr/bin/env node
// usage:
// bin/check-state-purestake.js --asset 13167477

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

require('dotenv').config()

const assetIndex = parseInt(argv.asset)
const algosdk = require('algosdk');
const baseServer = process.env.BASE_SERVER
const port = ""
const apiKey = process.env.PURESTAKE_API_KEY
const mnemonic = process.env.PRIVATE_SEED

const token = {
    'X-API-key' : apiKey,
}

let algodClient = new algosdk.Algodv2(token, baseServer, port)

// read local state of application from user account
async function readLocalState(client, account, index){
    let accountInfoResponse = await client.accountInformation(account.addr).do();
    for (let i = 0; i < accountInfoResponse['apps-local-state'].length; i++) {
        if (accountInfoResponse['apps-local-state'][i].id == index) {
            console.log("User's local state:");
            for (let n = 0; n < accountInfoResponse['apps-local-state'][i][`key-value`].length; n++) {
                console.log(accountInfoResponse['apps-local-state'][i][`key-value`][n]);
            }
        }
    }
}

// read global state of application
async function readGlobalState(client, account, index){
    let accountInfoResponse = await client.accountInformation(account.addr).do();
    for (let i = 0; i < accountInfoResponse['created-apps'].length; i++) {
        if (accountInfoResponse['created-apps'][i].id == index) {
            console.log("Application's global state:");
            for (let n = 0; n < accountInfoResponse['created-apps'][i]['params']['global-state'].length; n++) {
                console.log(accountInfoResponse['created-apps'][i]['params']['global-state'][n]);
            }
        }
    }
}

(async() => {
    var recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic);
    console.log(recoveredAccount.addr)
    // let accountInfoResponse = await algodClient.accountInformation(recoveredAccount.addr).do()
    readLocalState(algodClient, recoveredAccount, assetIndex)
    readGlobalState(algodClient, recoveredAccount, assetIndex)
})().catch(e => {
    console.log(e)
})