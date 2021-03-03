#!/usr/bin/env node
const config = require('./deploy.config.js')
const util = require('../lib/algoUtil')
const fs = require('fs')
const path = require('path')

// this script outputs grant and revoke transactions to be used by OREID multi-sig
// They should be signed by the reserve / contract admin account
// To gran roles to the tempLaunchAccount
async function rawGrantRolesTxn(roleId) {
    let appArgsGrantAllRoles = [
        util.EncodeBytes("grantRoles"),
        util.EncodeUint(roleId)
    ]

    let tx = await util.rawAppCall(
        config.client,
        config.contractAdminReserveAccountAddress,
        config.appId,
        appArgsGrantAllRoles,
        [config.tempLaunchAccount.addr])
    return tx
}

const x=1;(async() => {
    let tx1 = await rawGrantRolesTxn(15)
    fs.writeFile(path.join(__dirname, 'build', 'grantSuperAdmin.txn'), JSON.stringify(tx1), () => {})

    let tx2 = await rawGrantRolesTxn(0)
    fs.writeFile(path.join(__dirname, 'build', 'revokeSuperAdmin.txn'), JSON.stringify(tx2), () => {})

    console.log(`Wrote transactions to ${__dirname}/build`)
})().catch(e => {
    console.log(e)
})