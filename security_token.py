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
        App.localPut(Int(0), Bytes("contract admin"), Int(1)),
        App.localPut(Int(0), Bytes("transfer admin"), Int(1)),
        App.localPut(Int(0), Bytes("balance"), Int(0)),
        Return(Int(1))
    ])

    is_contract_admin = App.localGet(Int(0), Bytes("contract admin"))
    is_transfer_admin = App.localGet(Int(0), Bytes("transfer admin"))

    can_delete = And(
        is_contract_admin,
        App.globalGet(Bytes("total supply")) == App.globalGet(Bytes("reserve"))
    )

    on_closeout = Seq([
        App.globalPut(
            Bytes("reserve"),
            App.globalGet(Bytes("reserve")) + App.localGet(Int(0), Bytes("balance"))
        ),
        Return(Int(1))
    ])

    register = Seq([
        App.localPut(Int(0), Bytes("balance"), Int(0)),
        App.localPut(Int(0), Bytes("transfer group"), Int(1)),
        Return(Int(1))
    ])

    # pause all transfers
    # sender must be a contract admin
    new_pause_value = Btoi(Txn.application_args[1])
    pause = Seq([
        Assert(Txn.application_args.length() == Int(2)),
        App.globalPut(Bytes("paused"), new_pause_value),
        Return(is_contract_admin)
    ])

    # configure the admin status of the account Txn.accounts[0]
    # sender must be contract admin
    new_admin_type = Txn.application_args[1]
    new_admin_status = Btoi(Txn.application_args[2])
    set_admin = Seq([
        Assert(And(
            is_contract_admin,
            Txn.application_args.length() == Int(3),
            Or(new_admin_type == Bytes("contract admin"), new_admin_type == Bytes("transfer admin")),
            Txn.accounts.length() == Int(1)
        )),

        # to avoid removing all contract admins, we do not allow contract admins to remove their own contract admin role
        If(new_admin_type == Bytes("contract admin"), Assert(Neq(Txn.sender(), Txn.accounts[1]))),

        App.localPut(Int(1), new_admin_type, new_admin_status),
        Return(Int(1))
    ])

    # set transfer restrictions for Txn.accounts[1]:
    # 1) freeze
    # 2) max balance
    #     if max_balance_value is 0, will delete the existing max balance limitation on the account
    # 3) lock until a UNIX timestamp
    #     if lock_until_value is 0, will delete the existing lock until limitation on the account
    # 4) transfer group
    # sender must be transfer admin
    freeze_value = Btoi(Txn.application_args[1])
    max_balance_value = Btoi(Txn.application_args[2])
    lock_until_value = Btoi(Txn.application_args[3])
    transfer_group_value = Btoi(Txn.application_args[4])
    transfer_restrictions = Seq([
        Assert(And(
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
        Return(is_transfer_admin)
    ])

    def getRuleKey(sendGroup, receiveGroup):
        return Concat(Bytes("rule"), Itob(sendGroup), Itob(receiveGroup))

    # set a lock until time for transfers between a transfer from-group and a to-group
    # sender must be transfer admin
    lock_transfer_key = getRuleKey(Btoi(Txn.application_args[2]), Btoi(Txn.application_args[3]))
    lock_transfer_until = Btoi(Txn.application_args[4])
    lock_transfer_group = Seq([
        Assert(Txn.application_args.length() == Int(5)),
        If(lock_transfer_until == Int(0),
            App.globalDel(lock_transfer_key),
            App.globalPut(lock_transfer_key, lock_transfer_until)
        ),
        Return(is_transfer_admin)
    ])

    # move assets from the reserve to Txn.accounts[1]
    # sender must be contract admin
    mint_amount = Btoi(Txn.application_args[1])
    mint = Seq([
        Assert(And(
            Txn.application_args.length() == Int(2),
            Txn.accounts.length() == Int(1),
            mint_amount <= App.globalGet(Bytes("reserve"))
        )),
        App.globalPut(Bytes("reserve"), App.globalGet(Bytes("reserve")) - mint_amount),
        App.localPut(Int(1), Bytes("balance"), App.localGet(Int(1), Bytes("balance")) + mint_amount),
        Return(is_contract_admin)
    ])

    # move assets from Txn.accounts[1] to the reserve
    # sender must be contract admin
    burn_amount = Btoi(Txn.application_args[1])
    burn = Seq([
        Assert(And(
            Txn.application_args.length() == Int(2),
            Txn.accounts.length() == Int(1),
            burn_amount <= App.localGet(Int(1), Bytes("balance"))
        )),
        App.globalPut(Bytes("reserve"), App.globalGet(Bytes("reserve")) + burn_amount),
        App.localPut(Int(1), Bytes("balance"), App.localGet(Int(1), Bytes("balance")) - burn_amount),
        Return(is_contract_admin)
    ])

    # transfer assets from the sender to Txn.accounts[1]
    transfer_amount = Btoi(Txn.application_args[1])
    receiver_max_balance = App.localGetEx(Int(1), App.id(), Bytes("max balance"))
    transfer = Seq([
        Assert(And(
            Txn.application_args.length() == Int(2),
            Txn.accounts.length() == Int(1),
            transfer_amount <= App.localGet(Int(0), Bytes("balance"))
        )),
        receiver_max_balance,
        If(
            Or(
                App.globalGet(Bytes("paused")),
                App.localGet(Int(0), Bytes("frozen")),
                App.localGet(Int(0), Bytes("lock until")) >= Global.latest_timestamp(),
                App.globalGet(getRuleKey(App.localGet(Int(0), Bytes("transfer group")), App.localGet(Int(1), Bytes("transfer group")))) < Int(1),
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
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(can_delete)],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(is_contract_admin)],
        [Txn.on_completion() == OnComplete.CloseOut, on_closeout],
        [Txn.on_completion() == OnComplete.OptIn, register],
        [Txn.application_args[0] == Bytes("pause"), pause],
        [Txn.application_args[0] == Bytes("set admin"), set_admin],
        [Txn.application_args[0] == Bytes("transfer group"), lock_transfer_group],
        [Txn.application_args[0] == Bytes("transfer restrictions"), transfer_restrictions],
        [Txn.application_args[0] == Bytes("mint"), mint],
        [Txn.application_args[0] == Bytes("burn"), burn],
        [Txn.application_args[0] == Bytes("transfer"), transfer],
    )

    return program

def clear_state_program():
    program = Seq([
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
