# usage:
# bin/lock-until.sh 1_APP_ID 2_FROM 3_MODIFIED_ACCOUNT 4_LOCK_UNTIL
# example unix timestamp: 1732336661
# for Saturday, November 23, 2024 4:37:41 AM

APP_ID=$1
FROM=$2
MODIFIED_ACCOUNT=$3
LOCK_UNTIL_UNIX_TIMESTAMP=$4

goal app call --app-id $APP_ID --from $FROM --app-arg 'str:lock until' --app-account $MODIFIED_ACCOUNT --app-arg "int:$LOCK_UNTIL_UNIX_TIMESTAMP"  -d devnet/Primary