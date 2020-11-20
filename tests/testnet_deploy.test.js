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
    console.log(info)
})