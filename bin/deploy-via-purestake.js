#!/usr/bin/env node
require('dotenv').config()
const algosdk = require('algosdk')
const util = require('../lib/algoUtil')

const baseServer = process.env.BASE_SERVER
const port = ''
const mnemonic = process.env.PRIVATE_SEED
const apiKey = process.env.PURESTAKE_API_KEY
const cap = process.env.CAP
const decimals = process.env.DECIMALS
const symbol = process.env.SYMBOL
const name = process.env.NAME
const token = {
  'X-API-key': apiKey,
}

;(async () => {
  let algodClient = new algosdk.Algodv2(token, baseServer, port)
  var recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic)

  let info = await util.deploySecurityToken(
    algodClient,
    recoveredAccount,
    cap,
    decimals,
    symbol,
    name
  )
  console.log(info)
})().catch((e) => {
  console.log(e)
})
