from pyteal import *

# Code reused for setting the totalSupply in the mint, burn and clear state program
def update_total_supply():
    return App.globalPut(Bytes("totalSupply"), App.globalGet(Bytes("cap")) - App.globalGet(Bytes("reserve")))

def approval_program():
    on_creation = Seq([
        App.globalPut(Bytes("totalSupply"), Int(0)),
        App.globalPut(Bytes("cap"), Btoi(Txn.application_args[0])),
        App.globalPut(Bytes("reserve"), Btoi(Txn.application_args[0])),
        App.globalPut(Bytes("paused"), Int(0)),
        App.globalPut(Bytes("decimals"), Btoi(Txn.application_args[1])),
        App.globalPut(Bytes("symbol"), Txn.application_args[2]),
        App.globalPut(Bytes("name"), Txn.application_args[3]),

        App.localPut(Int(0), Bytes("transferGroup"), Int(1)),
        App.localPut(Int(0), Bytes("balance"), Int(0)),
        App.localPut(Int(0), Bytes("roles"), Int(15)),
        Return(Int(1))
    ])

    local_permissions = App.localGet(Int(0), Bytes("roles"))
    is_wallets_admin = BitwiseAnd(local_permissions, Int(1))
    is_transfer_rules_admin = BitwiseAnd(local_permissions, Int(2))
    is_reserve_admin = BitwiseAnd(local_permissions, Int(4))
    is_contract_admin = BitwiseAnd(local_permissions, Int(8))

    # when an account opts-in set the accounts local variables
    # balance of 0
    # transfer group 1
    register = Seq([
        App.localPut(Int(0), Bytes("balance"), Int(0)),
        App.localPut(Int(0), Bytes("maxBalance"), Int(0)),
        App.localPut(Int(0), Bytes("lockUntil"), Int(0)),
        App.localPut(Int(0), Bytes("transferGroup"), Int(1)),
        Return(Int(1))
    ])

    # pause all transfers
    # goal app call --app-id uint --from account --app-arg 'str:pause' --app-arg "int:${0 for false and 1 for true}"
    # the sender must be a contract admin
    new_pause_value = Btoi(Txn.application_args[1])
    pause = Seq([
        App.globalPut(Bytes("paused"), new_pause_value),
        Return(is_contract_admin)
    ])

    # Set Permissions
    # goal app call --app-id uint --from admin --app-account targetAddress --app-arg "str:grantRoles" --app-arg "int:${role-uint}"
    #
    # set contract permissions for Txn.accounts[1]
    # Txn.application_args[1] should be a 4-bit permissions integer
    # permssions can only be set by a contract admin
    #
    # Permissions are set with an integer where each of the first 4 bits represents a role:
    # Int(0)  | 0000 | No admin role
    # Int(1)  | 0001 | Wallets
    # Int(2)  | 0010 | Transfer Rules
    # Int(4)  | 0100 | Reserve
    # Int(8)  | 1000 | Contract Admin
    # Int(10) | 1010 | Contract Admin + Transfer Rules
    #
    # Roles can be combined using the bitmask for the binary representation of the permissions
    # then converted into the corresponding integer for the bitmask.
    # For example permission integer 15 grants all roles:
    # Int(15) | 1111 | Contract Admin + Reserve + Transfer Rules + Wallets
    #
    # Here is the full list of permissions integers and their corresponding bitmask
    # Role Int| Bits | Roles
    # Int(0)  | 0000 | No admin role
    # Int(1)  | 0001 | Wallets
    # Int(2)  | 0010 | Transfer Rules
    # Int(3)  | 0011 | Transfer Rules + Wallets
    # Int(4)  | 0100 | Reserve
    # Int(5)  | 0101 | Reserve + Wallets
    # Int(6)  | 0110 | Reserve + Transfer Rules
    # Int(7)  | 0111 | Reserve + Transfer Rules + Wallets
    # Int(8)  | 1000 | Contract Admin
    # Int(9)  | 1001 | Contract Admin + Wallets
    # Int(10) | 1010 | Contract Admin + Transfer Rules
    # Int(11) | 1011 | Contract Admin + Transfer Rules + Wallets
    # Int(12) | 1100 | Contract Admin + Reserve
    # Int(13) | 1101 | Contract Admin + Reserve + Wallets
    # Int(14) | 1110 | Contract Admin + Reserve + Transfer Rules
    # Int(15) | 1111 | Contract Admin + Reserve + Transfer Rules + Wallets
    #
    # WARNING: contract admin permission can only be revoked by other contract admins
    # to avoid removing all contract admins.
    roles = Btoi(Txn.application_args[1])
    grant_roles = Seq([
        Assert(And(
            is_contract_admin,
            roles <= Int(15)
        )),
        If(
            Eq(Txn.sender(), Txn.accounts[1]),
            Assert(BitwiseAnd(roles, Int(8)))
        ),
        App.localPut(Int(1), Bytes("roles"), roles),
        Return(Int(1))
    ])

    # setAddressPermissions
    # set address permissions for target Txn.accounts[1]:
    # arg 1) freeze
    # arg 2) maxBalance in the smallest token unit
    # arg 3) lockUntil a UNIX timestamp
    # arg 4) transfer group
    #
    # sender must be wallets admin
    freeze_value = Btoi(Txn.application_args[1])
    max_balance_value = Btoi(Txn.application_args[2])
    lock_until_value = Btoi(Txn.application_args[3])
    transfer_group_value = Btoi(Txn.application_args[4])
    set_address_permissions = Seq([
        Assert(And(
            is_wallets_admin,
            Txn.accounts.length() == Int(1)
        )),
        App.localPut(Int(1), Bytes("frozen"), freeze_value),
        App.localPut(Int(1), Bytes("maxBalance"), max_balance_value),
        App.localPut(Int(1), Bytes("lockUntil"), lock_until_value),
        App.localPut(Int(1), Bytes("transferGroup"), transfer_group_value),
        Return(Int(1))
    ])

    def getRuleKey(sendGroup, receiveGroup):
        return Concat(Bytes("rule"), Itob(sendGroup), Itob(receiveGroup))

    # setTransferRule
    # goal app call --app-id $APP_ID --from $FROM --app-arg 'str:setTransferRule' --app-arg "int:$FROM_GROUP_ID" \
    # --app-arg "int:$TO_GROUP_ID" --app-arg "int:$LOCK_UNTIL_UNIX_TIMESTAMP"
    #
    # set a lockUntil time for transfers between a transfer from-group and a to-group
    # each account belongs to 1 and only 1 group
    # by default transfers between groups are not allowed between groups
    # only at transfer rules admin can set transfer rules
    lock_transfer_key = getRuleKey(Btoi(Txn.application_args[1]), Btoi(Txn.application_args[2]))
    lock_transfer_until = Btoi(Txn.application_args[3])
    set_transfer_rules = Seq([
        Assert(is_transfer_rules_admin,),
        App.globalPut(lock_transfer_key, lock_transfer_until),
        Return(Int(1))
    ])

    # mint
    # goal app call --app-id uint --from address --app-account targetAddr --app-arg 'str:mint' --app-arg "int:${amount}"
    # move assets from the reserve to Txn.accounts[1]
    # the from address must have the asset admin role
    mint_amount = Btoi(Txn.application_args[1])
    receiver_max_balance = App.localGet(Int(1), Bytes("maxBalance"))
    mint = Seq([
        Assert(And(
            is_reserve_admin,
            Txn.accounts.length() == Int(1),
            mint_amount <= App.globalGet(Bytes("reserve"))
        )),
        Assert(
            Or(
                receiver_max_balance == Int(0),
                receiver_max_balance >= App.localGet(Int(1), Bytes("balance")) + mint_amount
            ),
        ),
        App.globalPut(Bytes("reserve"), App.globalGet(Bytes("reserve")) - mint_amount),
        App.localPut(Int(1), Bytes("balance"), App.localGet(Int(1), Bytes("balance")) + mint_amount),
        update_total_supply(),
        Return(Int(1))
    ])

    # burn
    # goal app call --app-id uint --from address --app-account targetAddr --app-arg 'str:burn' --app-arg "int:${amount}"
    # burn moves assets from Txn.accounts[1] to the reserve
    # the from address must have the assets admin role
    burn_amount = Btoi(Txn.application_args[1])
    burn = Seq([
        Assert(And(
            is_reserve_admin,
            Txn.accounts.length() == Int(1),
            burn_amount <= App.localGet(Int(1), Bytes("balance"))
        )),
        App.globalPut(Bytes("reserve"), App.globalGet(Bytes("reserve")) + burn_amount),
        App.localPut(Int(1), Bytes("balance"), App.localGet(Int(1), Bytes("balance")) - burn_amount),
        update_total_supply(),
        Return(Int(1))
    ])

    # accepts sender and receiver indices in current Txn.accounts[]
    # returns true if all checks are successful and transfer is allowed
    def isTransferAllowed(sender_idx, receiver_idx, amount):
        return Not(Or(
            Lt(App.localGet(sender_idx, Bytes("balance")), amount), # check sender balance
            App.globalGet(Bytes("paused")), # can't transfer when the contract is paused
            App.localGet(sender_idx, Bytes("frozen")), # sender account can't be frozen
            App.localGet(receiver_idx, Bytes("frozen")), # receiver account can't be frozen
            App.localGet(sender_idx, Bytes("lockUntil")) >= Global.latest_timestamp(), # sender account can't be locked

            # check that a transfer rule exists and allows the transfer from the sender to the receiver at the current time
            App.globalGet(getRuleKey(App.localGet(sender_idx, Bytes("transferGroup")), App.localGet(receiver_idx, Bytes("transferGroup")))) < Int(1),
            App.globalGet(getRuleKey(App.localGet(sender_idx, Bytes("transferGroup")), App.localGet(receiver_idx, Bytes("transferGroup")))) >= Global.latest_timestamp(),

            # check that max balance is not exceeded
            And(
                receiver_max_balance > Int(0),
                App.localGet(receiver_idx, Bytes("maxBalance")) < App.localGet(receiver_idx, Bytes("balance")) + amount
            )
        ))

    # detect
    # transaction succeeds if transfer is possible from the sender Txn.accounts[1] to the receiver Txn.accounts[2]
    # goal app call --app-id uint --from address --app-account senderAddr --app-account receiverAddr --app-arg 'str:detect' --app-arg "int:amount"
    # checks are made to see if the sender account is frozen or locked
    # checks are made to see if there is a transfer rule allowing transfer between sender and receiver transfer groups
    # the transfer must occur after the transfer group lockUntil date
    transfer_amount = Btoi(Txn.application_args[1])
    detect = Seq([
        Assert(isTransferAllowed(Int(1), Int(2), transfer_amount)),
        Return(Int(1))
    ])

    # transfer
    # transfers assets from the sender to the receiver Txn.accounts[1]
    # goal app call --app-id uint --from address --app-account receiverAddr --app-arg 'str:transfer' --app-arg "int:amount"
    # checks are made to see if the sender account is frozen or locked
    # checks are made to see if there is a transfer rule allowing transfer between sender and receiver transfer groups
    # the transfer must occur after the transfer group lockUntil date
    transfer_amount = Btoi(Txn.application_args[1])
    transfer = Seq([
        Assert(And(
            Txn.accounts.length() == Int(1),
            isTransferAllowed(Int(0), Int(1), transfer_amount)
        )),
        App.localPut(Int(0), Bytes("balance"), App.localGet(Int(0), Bytes("balance")) - transfer_amount),
        App.localPut(Int(1), Bytes("balance"), App.localGet(Int(1), Bytes("balance")) + transfer_amount),
        Return(Int(1))
    ])

    program = Cond(
        [Txn.application_id() == Int(0), on_creation],

        # goal app delete --app-id uint --from address
        # WARNING: to preserve critical global application state
        # calling this Algorand required app function will fail with "transaction rejected by ApprovalProgram"
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Int(0))],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(is_contract_admin)],

        # goal app closeout --app-id uint --from address
        # WARNING: to keep from deleting critical token balances held in the addresses local storage
        # do not allow the app to be closed out
        # calling this will fail with "transaction rejected by ApprovalProgram"
        [Txn.on_completion() == OnComplete.CloseOut, Return(Int(0))],
        [Txn.on_completion() == OnComplete.OptIn, register],
        [Txn.application_args[0] == Bytes("pause"), pause],
        [Txn.application_args[0] == Bytes("grantRoles"), grant_roles],
        [Txn.application_args[0] == Bytes("setTransferRule"), set_transfer_rules],
        [Txn.application_args[0] == Bytes("setAddressPermissions"), set_address_permissions],
        [Txn.application_args[0] == Bytes("mint"), mint],
        [Txn.application_args[0] == Bytes("burn"), burn],
        [Txn.application_args[0] == Bytes("transfer"), transfer],
        [Txn.application_args[0] == Bytes("detect"), detect],
    )

    return program

# All Algorand Apps can be cleared from an address that has opted in to the app by the account holder.
# For example, one way to clear an addresses app state is using the goal command:
# goal app clear --app-id uint --from address
#
# The clear state program handles clearing the app from an addresses local storage, returns tokens to the reserve,
# updates the totalSupply, and opts out the address from the app.
#
# WARNING: Calling this will return the tokens held by the address to the reserve and the account will no longer have
# the balance of tokens even if the account opts back in to the account. It is recommended that you never call clear
# state to avoid loosing your balance. It is implemented because it is required functionality for all Algorand Apps.
def clear_state_program():
    program = Seq([
        # To preserve cap integrity, balances are returned to the reserve when the clear state is executed.
        App.globalPut(
            Bytes("reserve"),
            App.globalGet(Bytes("reserve")) + App.localGet(Int(0), Bytes("balance"))
        ),
        update_total_supply(),
        Return(Int(1))
    ])

    return program

if __name__ == "__main__":
    with open('security_token_approval.teal', 'w') as f:
        compiled = compileTeal(approval_program(), Mode.Application)
        f.write(compiled)

    with open('security_token_clear_state.teal', 'w') as f:
        compiled = compileTeal(clear_state_program(), Mode.Application)
        f.write(compiled)
