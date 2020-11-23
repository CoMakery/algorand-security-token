# Algorand Security Token

This is an Open Source Algorand security token compatible with CoMakery. Although it is built on Algorand it follows the ERC-1404 security token standard. 

This token is modeled on the [CoMakery Security Token specification](https://github.com/CoMakery/comakery-security-token). An Algorand TEAL version was originally authored by [Derek Leung](https://github.com/derbear) at [Algorand Foundation](https://algorand.foundation/) in Racket with sTEAL. This codebase is the PyTeal rewrite of Derek's work by Jason Paulos with some modifications by Noah Thorp and the CoMakery Team.

The contract is written as a Python [PyTeal](https://github.com/algorand/pyteal) script that generates an Algorand TEAL Smart Contract.

__Although we hope this code is useful to you, it comes with no warranty of any kind. Do your own security audit and legal review.__

## Installation
* `git clone` this Algorand Security Token repository
* Install node.js from [Nodejs.org](https://nodejs.org)
* Follow the Algorand blockchain node [setup instructions](https://developer.algorand.org/docs/run-a-node/setup/install/). You will need this to run tests and scripts. You will know it's installed if you get the help info when you run `goal -h` from the command line.
* Install Python
* Get a purestake.com API key to deploy to testnet / mainnet using hosted nodes
* `cp .env.example .env` and enter your environment variables
* If you want to run a local node that syncs with testnet try https://github.com/algorand/sandbox - it will sync to testnet in minutes instead of days.

From the root directory of this code repository run
```bash
yarn install
```

## Key Files

* The `security_token.py` file compiles into two TEAL Files which are what is deployed to the Algorand blockchain
* `security_token_approval.teal` is the main smart contract application code
* `security_token_clear_state.teal` is a smaller file that cleans up memory if the app is uninstalled from the blockchain
* There are some useful javascript functions in `lib`
* Scripts for deploying and managing the contract are in `bin`
* The jest test suite is in the `tests` folder

## Running Tests
From the root of this repository run
```bash
yarn test
```
This starts a local private Algorand test network and runs automated tests. Then it shuts down the private network.

The tests are written in Javascript using the Jest testing framework.

## Guided Script Tour

Here's a good way to get acquanted with the contracts and scripts...

#### Start the private test network
```
bin/start-devnet.sh
```

Copy one of the generated online addresses that will look like `FQVRXH3NO3W2RHGHRDTXCL5IDZKSLEXINFNBF4GB7R3GCXNK4S4ZXFGRJY`

#### Deploy the contract to the local network the address:
```
bin/deploy-security-token.sh FQVRXH3NO3W2RHGHRDTXCL5IDZKSLEXINFNBF4GB7R3GCXNK4S4ZXFGRJY
```

Note that this script is for local deployment and not intended for deploying to testnet or mainnet. It will recompile the teal contracts by running `python security_token.py` which is a useful development feedback loop if you are developing the contract.

After you deploy make note of the deployment info that should look something like this:
```
Transaction 2XLM7Q3ORY7SN5M36M3334X6MKGFZ3GR2C3VO4TFCOUPMYQGLPMA still pending as of round 133
Transaction 2XLM7Q3ORY7SN5M36M3334X6MKGFZ3GR2C3VO4TFCOUPMYQGLPMA committed in round 135
Created app with app index 1
```

Make note of the app index... in the example above it is `1`.

#### Check the global state of the contract

Get the global state of the contract with
```
goal app read --global --app-id 1 -d devnet/Primary/
```

Get the local state for a specific account with
```
goal app read --local --app-id 1 --from FQVRXH3NO3W2RHGHRDTXCL5IDZKSLEXINFNBF4GB7R3GCXNK4S4ZXFGRJY -d devnet/Primary/
```

#### Shut down the private test network 

```
bin/stop-devnet.sh
```

Note: When it you rerun `bin/start-devnet.sh` it will **reset all data**

## Troubleshooting

#### Developer API & TEAL Compilation: `"EnableDeveloperAPI": true`
If during TEAL compilation javascript tests are failing to compile the contract or complain that there's no Algorand API endpoint, make sure that there is a `config.json` file in the data directory (e.g. `devnet/Primary/config.json`) that turns on the developer tools with the setting `"EnableDeveloperAPI": true`. The `bin/start-devnet.sh` script should create a new private network in the data directory called `devnet` and copy in the config/config.json with the right settings.

#### Javascript Argument Buffer Encodings
When you compile the contract from Javascript you need to encode all of the parameters. 
For example you may need to do something like the following to encode arguments in Javascript before passing them to the API. 
```
let enc = new TextEncoder()
let unitname = enc.encode("ABCTEST")
appArgs.push(unitname)
```

Note that you may also need to avoid overloading Javscript integer size by using a BigInt. An encoding step would still be necessery even with a small integer. Both cases are made easier with the `lib/algoUtils.js` `bigIntToUint8Array()` function.

```
let totalSupply = this.bigIntToUint8Array('8' + '0'.repeat(16))
appArgs.push(totalSupply)
```

## "Bad Request": maximum number of applications per account

The maximum applications you may have associated with your account is 10. If you try to install an 11th application you will get a `Bad Request` error.

# Application Functions

The TEAL assembly smart contract language uses program branches with no loops (it's non turing complete). The branches operate like functions in a typical programming language. There are also some default functions for upgrading and managing application memory systems. For simplicity I'll refer to the branches as "functions" in the table below.

| Function | Description | Callable By |
|-|-|-|
| on_creation | initializes the app when created | creator |
| DeleteApplication | called when the application is deleted|  |
| UpdateApplication | updates the TEAL code and keeps the memory intact | contract admin |
| CloseOut | called when closing out of the contract | everyone |
| OptIn | called by anyone who will use the app before they use the app | any account |
| "pause" | freezes all transfers | contract admin |
| "set admin" | gives an account contract admin rights | contract admin  |
| "freeze" | freezes a specific address | transfer admin |
| "max balance" | sets the max number of tokens an account can hold | transfer admin |
| "lock until" | lock the address to transfers until the specified date | transfer admin |
| "transfer group" | specifies the category of an address | transfer admin |
| "mint" | create new tokens from the reserve | contract admin |
| "burn" | destroy tokens from a specified address | contract admin |
| "transfer" | transfer from one account to another | any opted in account |

