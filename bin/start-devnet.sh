#!/bin/bash
export ALGOSMALLLAMBDAMSEC=200 # confirm private blockchain blocks fast
NETWORK_DIR=${1:-"$(pwd)/devnet"}
NETWORK_PRIMARY_KEY="${NETWORK_DIR}/Primary"
DEVNET_KMD="${NETWORK_PRIMARY_KEY}/kmd-v0.5"
CONFIG_DIR=./config/genesis.devnet.json

mkdir -p $NETWORK_DIR
goal network stop -r $NETWORK_DIR
goal kmd stop -d $NETWORK_PRIMARY_KEY
rm -rf $NETWORK_DIR
goal network create -r $NETWORK_DIR -n private -t $CONFIG_DIR
cp ./config/config.json devnet/Primary #to enable TEAL compilation, copy in a config with "EnableDeveloperAPI": true
ln -s $NETWORK_PRIMARY_KEY/algod.net $NETWORK_PRIMARY_KEY/algod-listen.net
goal network start -r $NETWORK_DIR -k $DEVNET_KMD -d $NETWORK_PRIMARY_KEY
goal kmd start -d $NETWORK_PRIMARY_KEY
echo $NETWORK_DIR
goal account list -d devnet/Primary/
