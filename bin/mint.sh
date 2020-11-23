# usage:
# bin/mint.sh appId fromToAddress amount
goal app call --app-id $1 --from $2 --app-account $2 --app-arg 'str:mint' --app-arg "int:${3}" -d devnet/Primary