require('dotenv').config()
const util = require('../lib/algoUtil')
const {EncodeUint} = util

function bufToBn(buf) {
    var hex = [];
    u8 = Uint8Array.from(buf);

    u8.forEach(function (i) {
        var h = i.toString(16);
        if (h.length % 2) { h = '0' + h; }
        hex.push(h);
    });

    return BigInt('0x' + hex.join(''));
}

it("can encode and decode uints", async () => {
    let input = '27'
    let encodedInt = EncodeUint('27')
    let decodedInt = bufToBn(encodedInt)
    expect(decodedInt.toString()).toEqual(input)
})