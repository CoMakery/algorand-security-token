# usage:
# bin/freeze.sh 1_appId 2_fromToAddress 3_accountToUpdate 4_freezeBoolean(ie 1|0)
goal app call --app-id $1 --from $2 --app-account $3 --app-arg 'str:freeze' --app-arg "int:${4}" -d devnet/Primary