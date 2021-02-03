# usage:
# bin/transfer-group-lock.sh 1_APP_ID 2_FROM 3_FROM_GROUP_ID 4_TO_GROUP_ID 5_LOCK_UNTIL
# example unix timestamp: 1732336661
# for Saturday, November 23, 2024 4:37:41 AM

APP_ID=$1
FROM=$2 # contract admin address
FROM_GROUP_ID=$3
TO_GROUP_ID=$4
LOCK_UNTIL_UNIX_TIMESTAMP=$5

# values passed to the app are:
# app-arg0: "str:setTransferRule"
# app-arg1: "int:from group id"
# app-arg2: "int:to group id"
# timestamp: unixtimestamp

goal app call --app-id $APP_ID --from $FROM --app-arg 'str:setTransferRule' --app-arg "int:$FROM_GROUP_ID" --app-arg "int:$TO_GROUP_ID" --app-arg "int:$LOCK_UNTIL_UNIX_TIMESTAMP"  -d devnet/Primary