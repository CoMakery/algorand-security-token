const fs = require('fs')
const path = require('path')
const algosdk = require('algosdk')
const JSONbig = require('json-bigint')
const shell = require('shelljs')
const {TextEncoder} = require('util')

exports.readLocalState = async (client, account, index) => {
    // API has rounding errors with big integers
    // this code was rounding 79999999999999973 to 79999999999999970
    // let accountInfoResponse = await client.accountInformation(account.addr).do()
    // let states = accountInfoResponse['apps-local-state'].find(e => e['id'] === index)
    // let localStates = states['key-value']
    // return exports.decodeState(localStates)

    let statusRaw = await shell.exec(` goal app read --local --from ${account.addr} --app-id ${index} -d devnet/Primary/`, {
        async: false,
        silent: false
    })
    if (statusRaw.stderr.length <= 0) {
        return JSONbig.parse(statusRaw.stdout)
    }
    throw statusRaw.stderr
}

exports.readGlobalState = async (client, account, index) => {
    let statusRaw = await shell.exec(` goal app read --global --app-id ${index} -d devnet/Primary/`, {
        async: false,
        silent: true
    })
    // API has rounding errors with big integers
    // this code was rounding 79999999999999973 to 79999999999999970
    // may want to switch back to this approach if it's fixed
    // let accountInfoResponse = await client.accountInformation(account.addr).do()
    // let states = accountInfoResponse['created-apps'].find(e => e['id'] === index)
    // let globalStates = states['params']['global-state']
    if (statusRaw.stderr.length <= 0) {
        return JSONbig.parse(statusRaw.stdout)
    }
    return JSONbig.parse(statusRaw.stdout)
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

// This is failing on the client.sendRawTransction step and needs debugging
// exports.transfer = async (client, senderAccount, receiverAccountAddress, amountInMicroAlgos) => {
//     let params = await client.getTransactionParams().do()
//     params.fee = 1000
//     params.flatFee = true
//     params.type = 'pay'
//
//     let txn = algosdk.makePaymentTxnWithSuggestedParams(
//         senderAccount.addr,
//         receiverAccountAddress,
//         amountInMicroAlgos,
//         undefined,
//         new Uint8Array(0),
//         params
//         )
//
//     console.log(txn)
//     let signedTxn = algosdk.signTransaction(txn, senderAccount.sk)
//     // let txId = txn.txID().toString()
//     console.log("Signed transaction for algo transfer with txID: %s", signedTxn)
//     let sendTx = await client.sendRawTransaction(signedTxn.blob).do() // TODO: discover why this is failing
//     await exports.waitForConfirmation(algodClient, sendTx.txId)
// }

exports.compileProgram = async function compileProgram(client, programPath) {
    let encoder = new TextEncoder()
    let programSource = fs.readFileSync(programPath, 'utf8')
    let programBytes = encoder.encode(programSource)
    let compileResponse = await client.compile(programBytes).do()
    return new Uint8Array(Buffer.from(compileResponse.result, "base64"))
}

exports.bigIntToUint8Array = function bigIntToUint8Array(bn) {
    var hex = BigInt(bn.toString()).toString(16);
    if (hex.length % 2) {
        hex = '0' + hex;
    }

    var len = hex.length / 2;
    var u8 = new Uint8Array(len);

    var i = 0;
    var j = 0;
    while (i < len) {
        u8[i] = parseInt(hex.slice(j, j + 2), 16);
        i += 1;
        j += 2;
    }

    return u8;
}

exports.decodeState = function decodeState(appStateArray) {
    let accumulator = {}
    appStateArray.forEach(state => {
        state.value.bytes = Buffer.from(state.value.bytes, 'base64').toString()
        state.key = Buffer.from(state.key, 'base64').toString()
        accumulator[state.key] = state.value
    })
    return accumulator
}

exports.deploySecurityToken = async (algodClient,
                                     account,
                                     cap = '8' + '0'.repeat(16),
                                     decimals = '8',
                                     symbol = "ABCTEST",
                                     name = "The XYZ Test Token"
) => {
    let txn = await this.rawDeploySecurityTokenTx(algodClient,
        account,
        cap,
        decimals,
        symbol,
        name
    )
    let signedTxn = algosdk.signTransaction(txn, account.sk)
    let sendTx = await algodClient.sendRawTransaction(signedTxn.blob).do()
    console.log("Transaction : ", sendTx)

    await exports.waitForConfirmation(algodClient, sendTx.txId)

    let transactionResponse = await algodClient.pendingTransactionInformation(sendTx.txId).do()
    let appId = transactionResponse['application-index']
    console.log("Created new app-id: ", appId)
    return {transaction: sendTx, appId: appId, sender: account.addr}
}

exports.rawDeploySecurityTokenTx = async (algodClient,
                                          account,
                                          cap = '8' + '0'.repeat(16),
                                          decimals = '8',
                                          symbol = "ABCTEST",
                                          name = "The XYZ Test Token"
) => {
    let appArgs = []

    cap = exports.bigIntToUint8Array(cap)
    appArgs.push(cap)

    decimals = exports.bigIntToUint8Array(decimals)
    appArgs.push(decimals)

    let enc = new TextEncoder()
    symbol = enc.encode(symbol)
    appArgs.push(symbol)

    let enc2 = new TextEncoder()
    name = enc2.encode(name)
    appArgs.push(name)

    let params = await algodClient.getTransactionParams().do()
    params.fee = 1000
    params.flatFee = true

    let sender = account.addr
    let onComplete = algosdk.OnApplicationComplete.OptInOC
    const approvalTeal = path.join(__dirname, '..', 'security_token_approval.teal')
    const clearTeal = path.join(__dirname, '..', 'security_token_clear_state.teal')
    console.log(approvalTeal)
    let approvalProgram = await exports.compileProgram(algodClient, approvalTeal)
    let clearProgram = await exports.compileProgram(algodClient, clearTeal)
    let localInts = 8
    let localBytes = 8
    let globalInts = 10
    let globalBytes = 54

    return algosdk.makeApplicationCreateTxn(sender, params, onComplete,
        approvalProgram, clearProgram,
        localInts, localBytes, globalInts, globalBytes, appArgs)
}

exports.upgradeSecurityToken = async (algodClient,
                                      account,
                                      appId,
                                      cap = '8' + '0'.repeat(16),
                                      decimals = '8',
                                      symbol = "ABCTEST"
) => {
    let appArgs = []

    cap = exports.bigIntToUint8Array(cap)
    appArgs.push(cap)

    decimals = exports.bigIntToUint8Array(decimals)
    appArgs.push(decimals)

    let enc = new TextEncoder()
    symbol = enc.encode(symbol)
    appArgs.push(symbol)

    let params = await algodClient.getTransactionParams().do()
    params.fee = 1000
    params.flatFee = true

    let sender = account.addr
    const approvalTeal = path.join(__dirname, '..', 'tests', 'upgrade_test_pyteal', 'contract_upgrade_test.teal')
    const clearTeal = path.join(__dirname, '..', 'tests', 'upgrade_test_pyteal', 'contract_upgrade_test_clear_state.teal')
    console.log(approvalTeal)
    let approvalProgram = await exports.compileProgram(algodClient, approvalTeal)
    let clearProgram = await exports.compileProgram(algodClient, clearTeal)

    let txn = algosdk.makeApplicationUpdateTxn(sender, params, appId, approvalProgram, clearProgram, appArgs)
    let signedTxn = algosdk.signTransaction(txn, account.sk)
    let sendTx = await algodClient.sendRawTransaction(signedTxn.blob).do()
    console.log("Transaction for Updating The App: ", sendTx)

    await exports.waitForConfirmation(algodClient, sendTx.txId)

    let transactionResponse = await algodClient.pendingTransactionInformation(sendTx.txId).do()
    console.log("Updated app: ", appId)
    return {transaction: sendTx, appId: appId, sender: sender}
}

exports.appCall = async function appCall(client, sender, appId, appArgs, appAccounts) {
    let params = await client.getTransactionParams().do()
    params.fee = 1000
    params.flatFee = true

    let txn = algosdk.makeApplicationNoOpTxn(sender.addr, params, appId, appArgs, appAccounts)
    let signedTxn = algosdk.signTransaction(txn, sender.sk)
    let sendTx = await client.sendRawTransaction(signedTxn.blob).do()

    console.log("Transaction : ", sendTx)
    await exports.waitForConfirmation(client, sendTx.txId)
    let transactionResponse = await client.pendingTransactionInformation(sendTx.txId).do()
    console.log(`transaction response: ${transactionResponse}`)
}

exports.rawAppCall = async function rawAppCall(client, senderAddress, appId, appArgs, appAccounts) {
    let params = await client.getTransactionParams().do()
    params.fee = 1000
    params.flatFee = true

    return algosdk.makeApplicationNoOpTxn(senderAddress, params, appId, appArgs, appAccounts)
}

exports.EncodeBytes = function EncodeBytes(utf8String) {
    let enc = new TextEncoder()
    return enc.encode(utf8String)
}

exports.EncodeUint = function EncodeUint(intOrString) {
    return exports.bigIntToUint8Array(intOrString)
}

exports.optInApp = async function optInApp(client, account, index) {
    // define sender
    let sender = account.addr;

    // get node suggested parameters
    let params = await client.getTransactionParams().do();
    // comment out the next two lines to use suggested fee
    params.fee = 1000;
    params.flatFee = true;

    // create unsigned transaction
    let txn = algosdk.makeApplicationOptInTxn(sender, params, index);
    let txId = txn.txID().toString();

    // Sign the transaction
    let signedTxn = txn.signTxn(account.sk);
    console.log("Signed transaction with txID: %s", txId);

    // Submit the transaction
    await client.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    await exports.waitForConfirmation(client, txId);

    // display results
    let transactionResponse = await client.pendingTransactionInformation(txId).do();
    console.log(`Opted In Address: ${sender} App Id:`, transactionResponse['txn']['txn']['apid'])
}

exports.clearState = async function clearState(client, account, index) {
    // define sender
    let sender = account.addr;

    // get node suggested parameters
    let params = await client.getTransactionParams().do();
    // comment out the next two lines to use suggested fee
    params.fee = 1000;
    params.flatFee = true;

    // create unsigned transaction
    let txn = algosdk.makeApplicationClearStateTxn(sender, params, index);
    let txId = txn.txID().toString();

    // Sign the transaction
    let signedTxn = txn.signTxn(account.sk);
    console.log("Signed transaction with txID: %s", txId);

    // Submit the transaction
    await client.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    await exports.waitForConfirmation(client, txId);

    // display results
    let transactionResponse = await client.pendingTransactionInformation(txId).do();
    console.log(`Clear State Address: ${sender} App Id:`, transactionResponse['txn']['txn']['apid'])
}

exports.setTransferRule = async function setTransferRule(
    client,
    senderAccount,
    index,
    fromGroupId,
    toGroupId,
    earliestPermittedTime) {


    let appArgs = [
        this.EncodeBytes('setTransferRule'),
        this.EncodeUint(fromGroupId),
        this.EncodeUint(toGroupId),
        this.EncodeUint(earliestPermittedTime)
    ]

    await this.appCall(client, senderAccount, index, appArgs, undefined)
}

exports.grantRoles = async function grantRoles(
    client,
    appId,
    senderAccount,
    targetAccountAddress,
    rolesId
) {
    appArgs = [
        this.EncodeBytes("grantRoles"),
        this.EncodeUint(rolesId)
    ]
    await this.appCall(client, senderAccount, appId, appArgs, [targetAccountAddress])
}

exports.setAddressPermissions = async function setAddressPermissions(
    client,
    appId,
    senderAccount,
    targetAccountAddress,
    frozen,
    maxBalance,
    lockUntil,
    transferGroup
) {
    appArgs = [
        this.EncodeBytes("setAddressPermissions"),
        this.EncodeUint(frozen),
        this.EncodeUint(maxBalance),
        this.EncodeUint(lockUntil),
        this.EncodeUint(transferGroup)]
    await this.appCall(client, senderAccount, appId, appArgs, [targetAccountAddress])
}

exports.mint = async function mint(
    client,
    appId,
    senderAccount,
    receiverAccountAddress,
    amount
) {
    appArgs = [
        this.EncodeBytes("mint"),
        this.EncodeUint(amount)
    ]
    await this.appCall(client, senderAccount, appId, appArgs, [receiverAccountAddress])
}

exports.checkAccountConfig = async (name, address, {client, appId}, minAlgoBalance=3000) => {
    let accountInfo = await client.accountInformation(address).do()
    let values = {
        name: name,
        address: address,
        optedIn: accountInfo['apps-local-state'].some(y => y['id'] == appId),
        algoBalance: accountInfo.amount
    }
    values.ready = values.algoBalance > minAlgoBalance && values.optedIn == true

    if(values.optedIn) {
        let localState = this.decodeState(accountInfo['apps-local-state'].find(y => y['id'] == appId)['key-value'])
        values.roles = localState.roles.uint
        values.transferGroup = localState.uint
        values.balance = localState.balance.uint
    } else {
        values.localState = null
    }

    return values
}

exports.getGlobalAppState = async ({client, appId} ) => {
    let application = await client.getApplicationByID(appId).do()
    let globalState = application['params']['global-state']
    let dState = this.decodeState(globalState)
    return {
        symbol: dState.symbol.bytes,
        totalSupply: dState.totalSupply.uint,
        cap: dState.cap.uint,
        decimals: dState.decimals.uint,
        name: dState.name.bytes,
        paused: dState.paused.uint,
        reserve: dState.reserve.uint
    }
}