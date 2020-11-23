# usage:
# bin/mint.sh appId fromToAddress toAddress amount
goal app call --app-id $1 --from $2 --app-account $3 --app-arg 'str:transfer' --app-arg "int:${4}" -d devnet/Primary