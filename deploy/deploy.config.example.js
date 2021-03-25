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
        {from: 100, to: 100, after: 1619827200},
        {from: 100, to: 102, after: 1619827200},
        {from: 101, to: 100, after: 1619827200},
        {from: 101, to: 102, after: 1619827200},
        {from: 102, to: 102, after: 1619827200},
        {from: 102, to: 100, after: 1648771200},
        {from: 103, to: 100, after: 0},
        {from: 103, to: 101, after: 0},
        {from: 103, to: 102, after: 0},
        {from: 104, to: 103, after: 0},
        {from: 105, to: 105, after: 0},
    ],
    hotWalletBalance: 1000,
    token: {
        cap: '8' + '0'.repeat(16),
        decimals: '8',
        symbol: 'ABC',
        name: 'Tesing ABC'
    }
}