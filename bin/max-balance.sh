# usage:
# bin/max-tokens.sh 1_APP_ID 2_FROM 3_MODIFIED_ACCOUNT 4_MAX_TOKEN_BALANCE

APP_ID=$1
FROM=$2
MODIFIED_ACCOUNT=$3
MAX_TOKEN_BALANCE=$4

goal app call --app-id $APP_ID --from $FROM --app-arg 'str:max balance' --app-account $MODIFIED_ACCOUNT --app-arg "int:$MAX_TOKEN_BALANCE"  -d devnet/Primary