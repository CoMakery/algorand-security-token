var params, sender, algod
const algosdk = require('algosdk')

beforeEach( async ()=> {
  await privateTestNetSetup()
  sender = accounts[0]
  algod = await initAlgod()
  params = await getChangingParams()
})

test('verfy environment sender address is valid', async () => {
  expect(algosdk.isValidAddress(sender.addr)).toEqual(true)
})

test('algorand test environment is configured properly', async () => {
  let txn = {
    "from": accounts[0].addr,
    to: accounts[1].addr,
    fee: params.fee,
    "amount": 1,
    "firstRound":params.firstRound,
    "lastRound": params.lastRound,
    "note": algosdk.encodeObj({'hola': '✋'}),
    "genesisID": params.genID,
    "genesisHash": params.genHash,
  }

  var signedTxn = algosdk.signTransaction(txn, sender.sk)
  let sentTxn = await algod.sendRawTransaction(signedTxn.blob)
  await waitForConfirmation(sentTxn.txId)

  let tx = await algod.transactionInformation(sender.addr, sentTxn.txId)

  expect(tx.type).toEqual('pay')
  expect(tx.fee).toEqual(1000)
  expect(tx.from).toEqual(sender.addr)
  expect(tx.payment.to).toEqual(accounts[1].addr)
  expect(tx.payment.amount).toEqual(1)

  let encodednote = algosdk.decodeObj(tx.note)
  expect(encodednote).toEqual({'hola': '✋'})
})