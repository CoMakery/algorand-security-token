# This example is provided for informational purposes only and has not been audited for security.

from pyteal import *

def update_total_supply():
    return App.globalPut(Bytes("totalSupply"), App.globalGet(Bytes("cap")) - App.globalGet(Bytes("reserve")))

def approval_program():
    local_permissions = App.localGet(Int(0), Bytes("roles"))
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

    mint_amount = Btoi(Txn.application_args[1])
    receiver_max_balance = App.localGet(Int(1), Bytes("maxBalance"))
    mint = Seq([
        Assert(And(
            is_reserve_admin,
            # Txn.accounts.length() == Int(1),
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

    setv = Seq([
        App.globalPut(Bytes("version"), Int(2)),
        App.localPut(Int(1),Bytes("local-version"), Int(2)),
        Return(Int(1))
    ])

    program = Cond(
        [Txn.application_id() == Int(0), Return(Int(1))],

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
        [Txn.application_args[0] == Bytes("mint"), mint],
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
        # To preserve cap integrity, balances are returned to the reserve when the clear state is executed.
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
