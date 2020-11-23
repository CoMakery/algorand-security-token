# usage:
# bin/mint.sh appId authorizedAdminAddress mintToAddress amount
goal app call --app-id $1 --from $2 --app-account $3 --app-arg 'str:mint' --app-arg "int:${4}" -d devnet/Primary