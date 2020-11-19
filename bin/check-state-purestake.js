#!/usr/bin/env node
// usage:
// bin/check-state-purestake.js --asset 13167477

const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

require('dotenv').config()

const assetIndex = parseInt(argv.asset)
const algosdk = require('algosdk');
const baseServer = process.env.BASE_SERVER
const port = ""
const apiKey = process.env.PURESTAKE_API_KEY
const mnemonic = process.env.PRIVATE_SEED

const token = {
    'X-API-key': apiKey,
}

let algodClient = new algosdk.Algodv2(token, baseServer, port)
// read local state of application from user account
async function readLocalState(client, account, index) {
    let accountInfoResponse = await client.accountInformation(account.addr).do();
    for (let i = 0; i < accountInfoResponse['apps-local-state'].length; i++) {
        if (accountInfoResponse['apps-local-state'][i].id == index) {
            console.log("User's local state:");
            for (let n = 0; n < accountInfoResponse['apps-local-state'][i][`key-value`].length; n++) {
                console.log(JSON.stringify(accountInfoResponse['apps-local-state'][i][`key-value`][n], undefined, 4));
            }
        }
    }
}

// read global state of application
async function readGlobalState(client, account, index) {
    let accountInfoResponse = await client.accountInformation(account.addr).do()
    let states = accountInfoResponse['created-apps'].find(e => e['id'] == index)
    let globalStates = states['params']['global-state']
    return globalStates.map(state => {
        state.value.bytes = Buffer.from(state.value.bytes, 'base64').toString()
        state.key = Buffer.from(state.key, 'base64').toString()
        return state
    })
    // }
}

(async () => {
    var recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic);
    console.log(recoveredAccount.addr)
    // readLocalState(algodClient, recoveredAccount, assetIndex)
    console.log(await readGlobalState(algodClient, recoveredAccount, assetIndex))
})().catch(e => {
    console.log(e)
})