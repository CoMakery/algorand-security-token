var sender
const algosdk = require('algosdk')
const util = require('../lib/algoUtil')

beforeEach( async ()=> {
  await privateTestNetSetup()
  sender = accounts[0]
})

test('verfy environment sender address is valid', async () => {
  expect(algosdk.isValidAddress(sender.addr)).toEqual(true)
})

test('algorand test environment is configured properly', async () => {
  let client = await initAlgod()

  let params = await getChangingParams()
  params["from"] = accounts[0].addr
  params["to"] =  accounts[1].addr
  params["amount"] = 1
  params["note"] =  algosdk.encodeObj({'hola': '✋'})

  let txn = new algosdk.Transaction(params)
  let signedTxn = algosdk.signTransaction(txn, sender.sk)
  let sentTxn = await client.sendRawTransaction(signedTxn.blob).do()
  console.log("Transaction: ", sentTxn)
  await util.waitForConfirmation(client, sentTxn.txId)

  let clientV1 = await initAlgodV1()
  let info = await clientV1.transactionInformation(accounts[0].addr, sentTxn.txId)

  expect(info.type).toEqual('pay')
  expect(info.fee).toEqual(1000)
  expect(info.from).toEqual(sender.addr)
  expect(info.payment.to).toEqual(accounts[1].addr)
  expect(info.payment.amount).toEqual(1)

  let encodednote = algosdk.decodeObj(info.note)
  expect(encodednote).toEqual({'hola': '✋'})
})