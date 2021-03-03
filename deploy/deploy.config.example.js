require('dotenv').config()
const algosdk = require('algosdk')

const baseServer = process.env.BASE_SERVER
const mnemonic = process.env.PRIVATE_SEED
const apiKey = process.env.PURESTAKE_API_KEY
const port = ""
const token = {'X-API-key' : apiKey}
const client = new algosdk.Algodv2(token, baseServer, port)
const tempLaunchAccount = algosdk.mnemonicToSecretKey(mnemonic)

module.exports = {
    client: client,
    appId: 14395337,
    tempLaunchAccount: tempLaunchAccount,
    contractAdminReserveAccountAddress: 'algorand address',
    manualAdminAccountAddress: 'algorand address',
    hotWalletAccountAddress: 'algorand address',
    transferRules: [
        {from: 2, to: 3, after: 1},
        {from: 3, to: 4, after: 1}
    ],
    hotWalletBalance: 1000,
    token: {
        cap: '8' + '0'.repeat(16),
        decimals: '8',
        symbol: 'ABC',
        name: 'Tesing ABC'
    }
}