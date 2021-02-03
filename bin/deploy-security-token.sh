#!/bin/bash

# call from project root with:
# bin/deploy-security-token.sh [account-of-creator]

echo "THIS COMMAND IS FOR RAPID DEVELOPMENT ON A PRIVATE NETWORK NOT DEPLOYMENT"

python security_token.py

export ADDR_CREATOR=$1
export TEAL_APPROVAL_PROG="security_token_approval.teal"
export TEAL_CLEAR_PROG="security_token_clear_state.teal"
export GLOBAL_BYTESLICES=54
export GLOBAL_INTS=10
export LOCAL_BYTESLICES=8
export LOCAL_INTS=8
export ALGORAND_DATA="devnet/Primary"

goal app create --creator $ADDR_CREATOR \
--approval-prog $TEAL_APPROVAL_PROG \
--clear-prog $TEAL_APPROVAL_PROG \
--global-byteslices $GLOBAL_BYTESLICES \
--global-ints $GLOBAL_INTS \
--local-byteslices $LOCAL_BYTESLICES \
--local-ints $LOCAL_INTS \
--app-arg "int:8000000000000000000" \
--app-arg "int:8" \
--app-arg "str:XYZTEST" \
--app-arg "str:Token of XYZ" \
--on-completion optin \
-d $ALGORAND_DATA