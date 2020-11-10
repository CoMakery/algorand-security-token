jest.setTimeout(60000)
const algosdk = require('algosdk')
const shell = require('shelljs')
const waitOn = require('wait-on')

const privTestNet = 'devnet'
const server = "http://127.0.0.1"
const port = 8080

async function initAlgod() {
    let token = await shell.cat(`${privTestNet}/Primary/algod.token`).stdout
    return new algosdk.Algod(token, server, port)
}

async function privateTestNetSetup() {
    await shell.exec(`bin/start-devnet.sh`, {
        async: false,
        silent: true
    })
    await waitOn({
        resources: [
            `${privTestNet}/Primary/algod.token`
        ]
    })
    let addresses = shell.exec(`goal account list -d ${privTestNet}/Primary/ | awk '{print $2}'`, {
        silent: true
    }).stdout.split("\n").slice(0, -1)

    global.accounts = addresses.map((address) => {
        var mnemonic = shell.exec(`goal account export -d ${privTestNet}/Primary -a ${address}`, {
            silent: true
        }).stdout.match(/"(.*)"/)[0].replace(/"/g, "")
        return algosdk.mnemonicToSecretKey(mnemonic)
    })
}

async function delay(n) {
    n = n || 2000
    return new Promise(done => {
        setTimeout(() => {
            done(true)
        }, n)
    })
}

async function waitForConfirmation(txId) {
    let algodclient = await initAlgod()
    while (await delay(1000)) {
        let pendingTxnInfo = await algodclient.pendingTransactionInformation(txId)
        let round = pendingTxnInfo.round
        // console.log("PendingTxnInfo: " + pendingTxnInfo.round)
        if (round != null && round > 0) {
            // console.log("Transaction " + pendingTxnInfo.tx + " confirmed in round " + round)
            break
        }
    }
}

// Utility function to get the latest parameters from the blockchain
async function getChangingParams() {
    let algod = await initAlgod()
    let cp = {
        fee: 0,
        firstRound: 0,
        lastRound: 0,
        genID: "",
        genHash: ""
    }
    let params = await algod.getTransactionParams()
    let sfee = await algod.suggestedFee()

    cp.firstRound = params.lastRound
    cp.lastRound = cp.firstRound + parseInt(1000)
    cp.fee = sfee.fee
    cp.genID = params.genesisID
    cp.genHash = params.genesishashb64

    return cp
}

async function signAndSend(signerKey, txn) {
    let algod = await initAlgod()
    let signedTxn = txn.signTxn(signerKey) // this is account.sk
    let sentTxn = await algod.sendRawTransaction(signedTxn)
    await waitForConfirmation(sentTxn.txId)
    return sentTxn
}

global.privateTestNetSetup = privateTestNetSetup
global.getChangingParams = getChangingParams
global.waitForConfirmation = waitForConfirmation
global.addresses
global.signAndSend = signAndSend
global.initAlgod = initAlgod