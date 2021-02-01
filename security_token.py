# This example is provided for informational purposes only and has not been audited for security.

from pyteal import *

def approval_program():
    on_creation = Seq([
        Assert(Txn.application_args.length() == Int(3)),
        App.globalPut(Bytes("total supply"), Btoi(Txn.application_args[0])),
        App.globalPut(Bytes("reserve"), Btoi(Txn.application_args[0])),
        App.globalPut(Bytes("paused"), Int(0)),
        App.globalPut(Bytes("decimals"), Btoi(Txn.application_args[1])),
        App.globalPut(Bytes("unitname"), Txn.application_args[2]),

        App.localPut(Int(0), Bytes("transfer group"), Int(1)),
        App.localPut(Int(0), Bytes("balance"), Int(0)),
        App.localPut(Int(0), Bytes("permissions"), Int(15)),
        Return(Int(1))
    ])

    local_permissions = App.localGet(Int(0), Bytes("permissions"))
    is_wallets_admin = BitwiseAnd(local_permissions, Int(1))
    is_transfer_rules_admin = BitwiseAnd(local_permissions, Int(2))
    is_reserve_admin = BitwiseAnd(local_permissions, Int(4))
    is_contract_admin = BitwiseAnd(local_permissions, Int(8))

    # when an account opts-in set the accounts local variables
    # balance of 0
    # transfer group 1
    register = Seq([
        App.localPut(Int(0), Bytes("balance"), Int(0)),
        App.localPut(Int(0), Bytes("transfer group"), Int(1)),
        Return(Int(1))
    ])

    # pause all transfers
    # goal app call --app-id uint --from account --app-arg 'str:pause' --app-arg "int:${0 for false and 1 for true}"
    # the sender must be a contract admin
    new_pause_value = Btoi(Txn.application_args[1])
    pause = Seq([
        Assert(Txn.application_args.length() == Int(2)),
        App.globalPut(Bytes("paused"), new_pause_value),
        Return(is_contract_admin)
    ])

    # Set Permissions
    # goal app call --app-id uint --from admin --app-account targetAddress --app-arg 'str:set permissions' --app-arg "int:${role-uint}"
    #
    # set contract permissions for Txn.accounts[1]
    # Txn.application_args[1] should be a 4-bit permissions integer
    # permssions can only be set by a contract admin

    # Permissions are set with an integer where each of the first 4 bits represents a role:
    # Int(0)  | 0000 | No admin role
    # Int(1)  | 0001 | Wallets
    # Int(2)  | 0010 | Transfer Rules
    # Int(4)  | 0100 | Reserve
    # Int(8)  | 1000 | Contract Admin
    # Int(10) | 1010 | Contract Admin + Transfer Rules

    # Roles can be combined using the bitmask for the binary representation of the permissions
    # then converted into the corresponding integer for the bitmask.
    # For example permission integer 15 grants all roles:
    # Int(15) | 1111 | Contract Admin + Reserve + Transfer Rules + Wallets

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
    permissions = Btoi(Txn.application_args[1])
    set_permissions = Seq([
        Assert(And(
            is_contract_admin,
            Txn.application_args.length() == Int(2),
            Txn.accounts.length() == Int(1),
            permissions <= Int(15)
        )),
        If( 
            Eq(Txn.sender(), Txn.accounts[1]),
            Assert(BitwiseAnd(permissions, Int(8)))
        ),
        App.localPut(Int(1), Bytes("permissions"), permissions),
        Return(Int(1))
    ])

    # transfer restrictions
    # set wallet transfer restrictions for Txn.accounts[1]:
    # 1) freeze
    # 2) max balance
    #     if max_balance_value is 0, will delete the existing max balance limitation on the account
    # 3) lock until a UNIX timestamp
    #     if lock_until_value is 0, will delete the existing lock until limitation on the account
    # 4) transfer group
    #
    # sender must be wallets admin
    freeze_value = Btoi(Txn.application_args[1])
    max_balance_value = Btoi(Txn.application_args[2])
    lock_until_value = Btoi(Txn.application_args[3])
    transfer_group_value = Btoi(Txn.application_args[4])
    set_wallet_transfer_restrictions = Seq([
        Assert(And(
            is_wallets_admin,
            Txn.application_args.length() == Int(5),
            Txn.accounts.length() == Int(1)
        )),
        App.localPut(Int(1), Bytes("frozen"), freeze_value),
        If(max_balance_value == Int(0),
            App.localDel(Int(1), Bytes("max balance")),
            App.localPut(Int(1), Bytes("max balance"), max_balance_value)
        ),
        If(lock_until_value == Int(0),
            App.localDel(Int(1), Bytes("lock until")),
            App.localPut(Int(1), Bytes("lock until"), lock_until_value)
        ),
        App.localPut(Int(1), Bytes("transfer group"), transfer_group_value),
        Return(Int(1))
    ])

    def getRuleKey(sendGroup, receiveGroup):
        return Concat(Bytes("rule"), Itob(sendGroup), Itob(receiveGroup))

    # set a lock until time for transfers between a transfer from-group and a to-group
    # each account belongs to 1 and only 1 group
    # by default transfers between groups are not allowed between groups
    # only at transfer rules admin can set transfer rules
    lock_transfer_key = getRuleKey(Btoi(Txn.application_args[2]), Btoi(Txn.application_args[3]))
    lock_transfer_until = Btoi(Txn.application_args[4])
    set_transfer_rules = Seq([
        Assert(And(
            is_transfer_rules_admin,
            Txn.application_args.length() == Int(5)
        )),
        If(lock_transfer_until == Int(0),
            App.globalDel(lock_transfer_key),
            App.globalPut(lock_transfer_key, lock_transfer_until)
        ),
        Return(Int(1))
    ])

    # mint
    # goal app call --app-id uint --from address --app-account targetAddr --app-arg 'str:mint' --app-arg "int:${amount}"
    # move assets from the reserve to Txn.accounts[1]
    # the from address must have the asset admin role
    mint_amount = Btoi(Txn.application_args[1])
    receiver_max_balance = App.localGetEx(Int(1), App.id(), Bytes("max balance"))
    mint = Seq([
        Assert(And(
            is_reserve_admin,
            Txn.application_args.length() == Int(2),
            Txn.accounts.length() == Int(1),
            mint_amount <= App.globalGet(Bytes("reserve"))
        )),
        receiver_max_balance,
        If(
            And(
                receiver_max_balance.hasValue(),
                receiver_max_balance.value() < App.localGet(Int(1), Bytes("balance")) + mint_amount
            ),
            Return(Int(0))
        ),
        App.globalPut(Bytes("reserve"), App.globalGet(Bytes("reserve")) - mint_amount),
        App.localPut(Int(1), Bytes("balance"), App.localGet(Int(1), Bytes("balance")) + mint_amount),
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
            Txn.application_args.length() == Int(2),
            Txn.accounts.length() == Int(1),
            burn_amount <= App.localGet(Int(1), Bytes("balance"))
        )),
        App.globalPut(Bytes("reserve"), App.globalGet(Bytes("reserve")) + burn_amount),
        App.localPut(Int(1), Bytes("balance"), App.localGet(Int(1), Bytes("balance")) - burn_amount),
        Return(Int(1))
    ])

    # transfer
    # transfers assets from the sender to the receiver Txn.accounts[1]
    # goal app call --app-id uint --from address --app-account receiverAddr --app-arg 'str:transfer' --app-arg "int:amount"
    # checks are made to see if the sender account is frozen or locked
    # checks are made to see if there is a transfer rule allowing transfer between sender and receiver transfer groups
    # the transfer must occur after the transfer group lock until date
    transfer_amount = Btoi(Txn.application_args[1])
    receiver_max_balance = App.localGetEx(Int(1), App.id(), Bytes("max balance"))
    transfer = Seq([
        Assert(And(
            Txn.application_args.length() == Int(2),
            Txn.accounts.length() == Int(1),
            transfer_amount <= App.localGet(Int(0), Bytes("balance"))
        )),

        # transfer amount should not exceed the receiver max balance
        # this can be used to enforce un-accredited investor max balances
        receiver_max_balance,
        If(
            Or(
                App.globalGet(Bytes("paused")), # can't transfer when the contract is paused
                App.localGet(Int(0), Bytes("frozen")), # sender account can't be frozen
                App.localGet(Int(0), Bytes("lock until")) >= Global.latest_timestamp(), # sender account can't be locked
                App.globalGet(getRuleKey(App.localGet(Int(0), Bytes("transfer group")), App.localGet(Int(1), Bytes("transfer group")))) < Int(1),

                # check that a transfer rule allows the transfer from the sender to the receiver at the current time
                App.globalGet(getRuleKey(App.localGet(Int(0), Bytes("transfer group")), App.localGet(Int(1), Bytes("transfer group")))) >= Global.latest_timestamp(),
                And(
                    receiver_max_balance.hasValue(),
                    receiver_max_balance.value() < App.localGet(Int(1), Bytes("balance")) + transfer_amount
                )
            ),
            Return(Int(0))
        ),
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
        [Txn.application_args[0] == Bytes("set permissions"), set_permissions],
        [Txn.application_args[0] == Bytes("transfer group"), set_transfer_rules],
        [Txn.application_args[0] == Bytes("transfer restrictions"), set_wallet_transfer_restrictions],
        [Txn.application_args[0] == Bytes("mint"), mint],
        [Txn.application_args[0] == Bytes("burn"), burn],
        [Txn.application_args[0] == Bytes("transfer"), transfer],
    )

    return program

# All Algorand Apps can be cleared from an address that has opted in to the app by the account holder.
# For example, one way to clear an addresses app state is using the goal command:
# goal app clear --app-id uint --from address
#
# The clear state program handles clearing the app from an addresses local storage, returns tokens to the reserve,
# and opts out the address from the app.
#
# WARNING: Calling this will return the tokens held by the address to the reserve and the account will no longer have
# the balance of tokens even if the account opts back in to the account. It is recommended that you never call clear
# state to avoid loosing your balance. It is implemented because it is required functionality for all Algorand Apps.
def clear_state_program():
    program = Seq([
        # To preserve total supply integrity, balances are returned to the reserve when the clear state is executed.
        App.globalPut(
            Bytes("reserve"),
            App.globalGet(Bytes("reserve")) + App.localGet(Int(0), Bytes("balance"))
        ),
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
