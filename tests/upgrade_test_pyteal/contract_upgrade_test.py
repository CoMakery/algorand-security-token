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
    is_assets_admin = BitwiseAnd(local_permissions, Int(4))
    is_contract_admin = BitwiseAnd(local_permissions, Int(8))

    # when an account opts-in set the accounts local variables
    # balance of 0
    # transfer group 1
    register = Seq([
        App.localPut(Int(0), Bytes("balance"), Int(0)),
        App.localPut(Int(0), Bytes("transfer group"), Int(1)),
        Return(Int(1))
    ])


    # set contract permissions for Txn.accounts[1]
    # Txn.application_args[1] should be a 4-bit permissions integer,
    # where each bit represents a role:
    # 1) account transfer restrictions (wallets admin)
    # 2) transfer rules (transfer rules admin)
    # 3) mint/burn (assets admin)
    # 4) granting permissions (contract admin)
    #
    # examples:
    # Int(1) 0001 – access to account transfer restrictions
    # Int(3) 0011 – access to account transfer restrictions and transfer rules
    # Int(6) 0110 – access to transfer rules and mint/burn
    # Int(8) 1000 – access to granting permissions (= contract admin)
    # Int(15) 1111 – access to everything (= contract admin)
    #
    # contract admin permission can only be revoked by other contract admin
    # to avoid removing all contract admins
    #
    # sender must be contract admin
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

    # set transfer restrictions for Txn.accounts[1]:
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
    transfer_restrictions = Seq([
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
    #
    # sender must be transfer rules admin
    lock_transfer_key = getRuleKey(Btoi(Txn.application_args[2]), Btoi(Txn.application_args[3]))
    lock_transfer_until = Btoi(Txn.application_args[4])
    lock_transfer_group = Seq([
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

    # move assets from the reserve to Txn.accounts[0]
    #
    # sender must be assets admin
    mint_amount = Btoi(Txn.application_args[1])
    receiver_max_balance = App.localGetEx(Int(1), App.id(), Bytes("max balance"))
    mint = Seq([
        Assert(And(
            is_assets_admin,
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

    # move assets from Txn.accounts[0] to the reserve
    #
    # sender must be assets admin
    burn_amount = Btoi(Txn.application_args[1])
    burn = Seq([
        Assert(And(
            is_assets_admin,
            Txn.application_args.length() == Int(2),
            Txn.accounts.length() == Int(1),
            burn_amount <= App.localGet(Int(1), Bytes("balance"))
        )),
        App.globalPut(Bytes("reserve"), App.globalGet(Bytes("reserve")) + burn_amount),
        App.localPut(Int(1), Bytes("balance"), App.localGet(Int(1), Bytes("balance")) - burn_amount),
        Return(Int(1))
    ])

    # goal app call --app-id $1 --from $2 --app-account $3 --app-arg 'str:transfer' --app-arg "int:${4}"
    # transfer assets from the sender to Txn.accounts[1]
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

    setv = Seq([
        App.globalPut(Bytes("version"), Int(2)),
        App.localPut(Int(1),Bytes("local-version"), Int(2)),
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
        # [Txn.application_args[0] == Bytes("pause"), pause], # delete pause
        [Txn.application_args[0] == Bytes("set permissions"), set_permissions],
        [Txn.application_args[0] == Bytes("transfer group"), lock_transfer_group],
        [Txn.application_args[0] == Bytes("transfer restrictions"), transfer_restrictions],
        [Txn.application_args[0] == Bytes("mint"), mint],
        [Txn.application_args[0] == Bytes("burn"), burn],
        [Txn.application_args[0] == Bytes("transfer"), transfer],
        [Txn.application_args[0] == Bytes("setversion"), setv], #ADDED THIS FUNCTION FOR THE UPGRADE
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
    with open('contract_upgrade_test.teal', 'w') as f:
        compiled = compileTeal(approval_program(), Mode.Application)
        f.write(compiled)

    with open('contract_upgrade_test_clear_state.teal', 'w') as f:
        compiled = compileTeal(clear_state_program(), Mode.Application)
        f.write(compiled)
