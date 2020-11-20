require('dotenv').config()

const util = require('../lib/algoUtil')
const algosdk = require('algosdk')
const baseServer = process.env.BASE_SERVER
const recoveredAccount = algosdk.mnemonicToSecretKey(process.env.PRIVATE_SEED)
const apiKey = process.env.PURESTAKE_API_KEY
const port = ""
const token = {
    'X-API-key': apiKey,
}

test('testnet deploy', async () => {
    let algodClient = new algosdk.Algodv2(token, baseServer, port);
    let info = await util.deploySecurityToken(algodClient, recoveredAccount)
    let localState = await util.readLocalState(algodClient, recoveredAccount, info.appId)
    expect(localState.sort()).toEqual(
        [
            { key: 'contract admin', value: { bytes: '', type: 2, uint: 1 } },
            { key: 'transfer admin', value: { bytes: '', type: 2, uint: 1 } },
            { key: 'balance', value: { bytes: '', type: 2, uint: 0 } }
        ].sort()
    )
    let globalState = await util.readGlobalState(algodClient, recoveredAccount, info.appId)
    expect(globalState.sort()).toEqual(
        [
            { key: 'paused', value: { bytes: '', type: 2, uint: 0 } },
            {
                key: 'total supply',
                value: { bytes: '', type: 2, uint: 80000000000000000 }
            },
            {
                key: 'reserve',
                value: { bytes: '', type: 2, uint: 80000000000000000 }
            }
        ].sort()
    )
})