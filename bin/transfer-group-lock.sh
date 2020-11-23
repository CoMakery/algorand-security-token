# usage:
# bin/transfer-group-lock.sh 1_APP_ID 2_FROM 3_FROM_GROUP_ID 4_TO_GROUP_ID 5_LOCK_UNTIL
# example unix timestamp: 1732336661
# for Saturday, November 23, 2024 4:37:41 AM

APP_ID=$1
FROM=$2
FROM_GROUP_ID=$3
TO_GROUP_ID=$4
LOCK_UNTIL_UNIX_TIMESTAMP=$5

# values passed to the app are:
# app-arg0: "str:transfer group"
# app-arg1: "str:lock"
# app-arg2: "int:groupId"
# addr1: addressToSet

goal app call --app-id $APP_ID --from $FROM --app-arg 'str:transfer group' --app-arg 'str:lock' --app-arg "int:$FROM_GROUP_ID" --app-arg "int:$TO_GROUP_ID" --app-arg "int:$LOCK_UNTIL_UNIX_TIMESTAMP"  -d devnet/Primary