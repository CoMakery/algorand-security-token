const fs = require('fs')

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