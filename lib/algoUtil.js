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

function decodeState(appStateArray) {
    return appStateArray.map(state => {
        state.value.bytes = Buffer.from(state.value.bytes, 'base64').toString()
        state.key = Buffer.from(state.key, 'base64').toString()
        return state
    })
}