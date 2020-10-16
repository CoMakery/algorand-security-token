# Algorand Security Token

An Algorand security token compatible with CoMakery. It was originally authored by [Derek Leung](https://github.com/derbear) at [Algorand Foundation](https://algorand.foundation/). This token is modeled on the [CoMakery Security Token specification](https://github.com/CoMakery/comakery-security-token).

It is AGPL open source licensed.

Although it is built on Algorand it follows the ERC-1404 security token standard. The contract is written in [sTEAL](https://github.com/derbear/steal) which is [Racket](https://racket-lang.org) language code that compiles to an Algorand TEAL Smart Contract.

## Install
* Install node.js from [Nodejs.org](https://nodejs.org)
* Follow the Algorand blockchain node [setup instructions](https://developer.algorand.org/docs/run-a-node/setup/install/)
* `git clone` this Algorand Security Token repository

From the root directory of this code repository run
```bash
yarn install
```
## Running Tests
From the root of this repository run
```bash
yarn test
```
This starts a local private Algorand test network and runs automated tests. Then it shuts down the private network.

The tests are written in Javascript using the Jest testing framework.