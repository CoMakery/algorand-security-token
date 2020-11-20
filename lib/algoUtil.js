const fs = require('fs')
const algosdk = require('algosdk')

exports.readLocalState = async (client, account, index) => {
    let accountInfoResponse = await client.accountInformation(account.addr).do()
    let states = accountInfoResponse['apps-local-state'].find(e => e['id'] === index)
    let localStates = states['key-value']
    return decodeState(localStates)

}

exports.readGlobalState = async (client, account, index) => {
    let accountInfoResponse = await client.accountInformation(account.addr).do()
    let states = accountInfoResponse['created-apps'].find(e => e['id'] === index)
    let globalStates = states['params']['global-state']
    return decodeState(globalStates)
}

exports.waitForConfirmation = async (algodclient, txId) => {
    let status = (await algodclient.status().do())
    let lastRound = status["last-round"]
    while (true) {
        const pendingInfo = await algodclient.pendingTransactionInformation(txId).do()
        if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
            console.log("Transaction " + txId + " confirmed in round " + pendingInfo["confirmed-round"])
            break
        }
        lastRound++
        await algodclient.statusAfterBlock(lastRound).do()
    }
}

exports.compileProgram = async function compileProgram(client, programPath) {
    let encoder = new TextEncoder()
    let programSource = fs.readFileSync(programPath, 'utf8')
    let programBytes = encoder.encode(programSource)
    let compileResponse = await client.compile(programBytes).do()
    return new Uint8Array(Buffer.from(compileResponse.result, "base64"))
}

exports.bigIntToUint8Array = function bigIntToUint8Array(bn) {
    var hex = BigInt(bn).toString(16);
    if (hex.length % 2) { hex = '0' + hex; }

    var len = hex.length / 2;
    var u8 = new Uint8Array(len);

    var i = 0;
    var j = 0;
    while (i < len) {
        u8[i] = parseInt(hex.slice(j, j+2), 16);
        i += 1;
        j += 2;
    }

    return u8;
}

function decodeState(appStateArray) {
    return appStateArray.map(state => {
        state.value.bytes = Buffer.from(state.value.bytes, 'base64').toString()
        state.key = Buffer.from(state.key, 'base64').toString()
        return state
    })
}

exports.deploySecurityToken = async (algodClient, account) => {
    let totalSupply = this.bigIntToUint8Array('8' + '0'.repeat(16))
    let params = await algodClient.getTransactionParams().do()
    params.fee = 1000
    params.flatFee = true

    let sender = account.addr
    let onComplete =  algosdk.OnApplicationComplete.OptInOC
    let approvalProgram = await this.compileProgram(algodClient,'./security_token_approval.teal')
    let clearProgram = await this.compileProgram(algodClient, './security_token_clear_state.teal')
    let localInts = 3
    let localBytes = 0
    let globalInts = 3
    let globalBytes = 0
    let appArgs = []
    appArgs.push(totalSupply)

    let txn = algosdk.makeApplicationCreateTxn(sender, params, onComplete,
        approvalProgram, clearProgram,
        localInts, localBytes, globalInts, globalBytes, appArgs)
    let signedTxn = algosdk.signTransaction(txn, account.sk)
    let sendTx = await algodClient.sendRawTransaction(signedTxn.blob).do()
    console.log("Transaction : ", sendTx)

    await this.waitForConfirmation(algodClient, sendTx.txId)

    let transactionResponse = await algodClient.pendingTransactionInformation(sendTx.txId).do()
    let appId = transactionResponse['application-index']
    console.log("Created new app-id: ", appId)
    return {transaction: sendTx, appId: appId, sender: sender}
}