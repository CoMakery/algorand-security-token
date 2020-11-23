# usage:
# bin/set-stransfer-group.sh 1_appId 2_callFrom 3_groupId 4_addressToSet
# values passed to the app are:
# app-arg0: "str:transfer group"
# app-arg1: "str:set"
# app-arg2: "int:groupId"
# addr1: addressToSet

APP_ID=$1
FROM=$2
GROUP_ID=$3
ADDRESS_TO_SET=$4

goal app call --app-id $APP_ID --from $FROM --app-arg 'str:transfer group' --app-arg 'str:set' --app-arg "int:$GROUP_ID" --app-account $ADDRESS_TO_SET -d devnet/Primary