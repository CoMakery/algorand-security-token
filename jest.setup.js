jest.setTimeout(60000)
const algosdk = require('algosdk')
const shell = require('shelljs')
const waitOn = require('wait-on')
shell.env["ALGOSMALLLAMBDAMSEC"]=1

const privTestNet = 'devnet'
const server = "http://127.0.0.1"
const port = 8080

async function initAlgod() {
    let token = await shell.cat(`${privTestNet}/Primary/algod.token`).stdout
    return new algosdk.Algodv2(token, server, port)
}

async function initAlgodV1() {
    let token = await shell.cat(`${privTestNet}/Primary/algod.token`).stdout
    return new algosdk.Algod(token, server, port)
}

async function privateTestNetSetup() {
    let status =  await shell.exec(` goal node status -d ${privTestNet}/Primary/`, {
        async: false,
        silent: true
    }).stderr
    let isNodeRunning = !(/Cannot contact Algorand node/.test(status))

    if(isNodeRunning) {

    } else{
        await shell.exec(`bin/start-devnet.sh`, {
            async: false,
            silent: true
        })
    }

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

    let params = await algod.getTransactionParams().do()
    params.fee = 1000
    params.flatFee = true
    // params.genesisHash = params.genHash
    return params
}

async function signAndSend(signerKey, txn) {
    let client = await initAlgod()
    let signedTxn = txn.signTxn(signerKey) // this is account.sk
    let sentTxn = await client.sendRawTransaction(signedTxn.blob)
    await waitForConfirmation(sentTxn.txId)
    return sentTxn
}

global.privateTestNetSetup = privateTestNetSetup
global.getChangingParams = getChangingParams
global.waitForConfirmation = waitForConfirmation
global.addresses
global.signAndSend = signAndSend
global.initAlgod = initAlgod
global.initAlgodV1 = initAlgodV1