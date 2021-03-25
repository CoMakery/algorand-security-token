const util = require('./algoUtil')

exports.checkOptedInAndHasAlgos = async (_client, _addr, appId) => {
    let accountInfo = await _client.accountInformation(_addr).do()
    console.log(accountInfo)

    expect(accountInfo.amount).toBeGreaterThan(10000)
    expect(accountInfo['apps-local-state']).toEqual(
        expect.arrayContaining([
                expect.objectContaining({id: appId})
            ]
        )
    )
}

exports.checkAllAccountsReady = async (client, appId, config) => {
    // check all accounts to be configured have opted in to the application and have algos for gas
    await this.checkOptedInAndHasAlgos(client, config.tempLaunchAccount.addr, appId)
    await this.checkOptedInAndHasAlgos(client, config.manualAdminAccountAddress, appId)
    await this.checkOptedInAndHasAlgos(client, config.hotWalletAccountAddress, appId)
}

exports.configureContract = async (client, appId, config) => {
    // set the transfer rules
    await Promise.all(config.transferRules.map(rule => {
            util.setTransferRule(
                client,
                tempLaunchAccount,
                appId,
                rule.from,
                rule.to,
                rule.after)
        })
    )

    // manualAdmin account: transferRules, walletAdmin, admin transfer group
    await util.grantRoles(client, appId, config.tempLaunchAccount, config.manualAdminAccountAddress, 3)
    await util.setAddressPermissions(client, appId, config.tempLaunchAccount, config.manualAdminAccountAddress, 0, 0, 0, 2)

    // hotWallet: walletAdmin, admin transfer group
    await util.grantRoles(client, appId, config.tempLaunchAccount, config.hotWalletAccountAddress, 1)
    await util.setAddressPermissions(client, appId, config.tempLaunchAccount, config.hotWalletAccountAddress, 0, 0, 0, 2)

    // the reserve admin mints initial tokens needed for hot wallet distribution into the hot wallet
    await util.mint(client, appId, config.tempLaunchAccount, config.hotWalletAccountAddress, config.hotWalletBalance)
}