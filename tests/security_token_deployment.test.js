var params, sender, algod
const algosdk = require('algosdk')
const shell = require('shelljs')

beforeEach( async ()=> {
    await privateTestNetSetup()
    sender = accounts[0]
    algod = await initAlgod()
    params = await getChangingParams()
})

test('test deployment and global state', async () => {
    let command = `bin/deploy-security-token.sh ${sender.addr}`

    let output = await shell.exec(command, {
        async: false,
        silent: false
    }).stdout.split("\n")

    // console.log(output)

    let appId = output[4].match(/(\d+$)/)[0]
    // console.log(appId)

    expect(appId).toMatch(/^\d$/)
    let command2 = `goal app read --global --app-id ${appId} -d devnet/Primary`
    let output2 = await shell.exec(command2, {
        async: false,
        silent: false
    }).stdout

    // console.log(output2)
    let globalState = JSON.parse(output2)
    expect(globalState.reserve.ui).toBe(1000)
})