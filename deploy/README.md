# How To Deploy The Smart Contracts With An OREID Multi-Sig Reserve Account

Here are the steps for deploying using a multi-signature ORE wallet and the scripts in the `deploy` directory.

## Deploy The Contract
1] Configure your `.env` file with your `PURESTAKE_API_KEY` and `PRIVATE_SEED` and `BASE_SERVER`. The PRIVATE_SEED mnemonic will be used to generate your tempLaunchAccount used to configure everything in the next step.

2] Call `./deploy/1_generate_contractDeployment_transactions_for_orid.js` to create the contract transaction, then sign this raw transaction to deploy the contract with a multi-sig account. Keep track of the `appId`.

## Prepare Admin Accounts For The Configuration Script

3] Send algos for **gas** the tempLaunchAccount, manualAdminAccount and hotWalletAccount.

4] **Opt In** to the token contract with the `appId`.

5] Copy `deploy/deploy.config.js.example` to your own file `deploy/deploy.config.js` 

6] Configure your `deploy/deploy.config.js` file with your accounts, transfer rules, hotWallet balance and token configuration details. 

7] Verify that your accounts are ready for the configuration script by running `./deploy/2_check_accounts_are_ready_for_configuration.js`

8] Generate the transactions that will be needed to grant and revoke super admin rights for your tempLaunchAccount with `deploy/3_generate_app_management_transactions.js`

9] Grant superAdmin rights to the tempLaunchAccount by calling `deploy/build/grantSuperAdmin.txn` from the ORE multi-sig wallet.

## Run The Script To Configure The Smart Contract

10] Configure the token rules, wallet roles and mint tokens to the hot wallet by calling `./deploy/configure.js`

## Remove Temp Deployer Account

11] Remove superAdmin rights from the tempLaunchAccount by calling `deploy/build/revokeSuperAdmin.txn` from the ORE multi-sig wallet.

## Verify It's All Setup Properly

12] Verify that the final state is good by running `./deploy/5_check_final_state.js`