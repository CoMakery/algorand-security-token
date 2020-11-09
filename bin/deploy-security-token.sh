#!/bin/bash

# call from project root with:
# bin/deploy-security-token.sh [account-of-creator]

export ADDR_CREATOR=$1
export TEAL_APPROVAL_PROG="security_token_approval.teal"
export TEAL_CLEAR_PROG="security_token_clear_state.teal"
export GLOBAL_BYTESLICES=0
export GLOBAL_INTS=3
export LOCAL_BYTESLICES=0
export LOCAL_INTS=3
export ALGORAND_DATA="devnet/Primary"

goal app create --creator $ADDR_CREATOR \
--approval-prog $TEAL_APPROVAL_PROG \
--clear-prog $TEAL_APPROVAL_PROG \
--global-byteslices $GLOBAL_BYTESLICES \
--global-ints $GLOBAL_INTS \
--local-byteslices $LOCAL_BYTESLICES \
--local-ints $LOCAL_INTS \
--app-arg "int:1000" \
-d $ALGORAND_DATA