# usage:
# bin/set-contract-admin.sh 1_appId 2_fromToAddress 3_accountToUpdate 4_statusBoolean(ie 1|0)
goal app call --app-id $1 --from $2 --app-account $3 --app-arg 'str:set admin' --app-arg 'str:contract admin' --app-arg "int:${4}" -d devnet/Primary