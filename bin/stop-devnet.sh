#!/bin/bash

NETWORK_DIR=${1:-"$(pwd)/devnet"}
NETWORK_PRIMARY_KEY="${NETWORK_DIR}/Primary"
# NETWORK_PORT=${2:-8080}
CONFIG_DIR=./config/genesis.devnet.json

goal network stop -r $NETWORK_DIR && goal kmd stop -d $NETWORK_PRIMARY_KEY
