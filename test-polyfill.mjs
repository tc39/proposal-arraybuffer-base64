import test from 'node:test';
import assert from 'node:assert';

import {
  uint8ArrayToBase64,
  base64ToUint8Array,
  uint8ArrayToHex,
  hexToUint8Array,
} from './playground/polyfill-core.mjs';

let stringToBytes = str => new TextEncoder().encode(str);

// https://datatracker.ietf.org/doc/html/rfc4648#section-10
let standardBase64Vectors = [
  ['', ''],
  ['f', 'Zg=='],
  ['fo', 'Zm8='],
  ['foo', 'Zm9v'],
  ['foob', 'Zm9vYg=='],
  ['fooba', 'Zm9vYmE='],
  ['foobar', 'Zm9vYmFy'],
];
test('standard vectors', async t => {
  for (let [string, result] of standardBase64Vectors) {
    await t.test(JSON.stringify(string), () => {
      assert.strictEqual(uint8ArrayToBase64(stringToBytes(string)), result);

      assert.deepStrictEqual(base64ToUint8Array(result), stringToBytes(string));
      assert.deepStrictEqual(base64ToUint8Array(result, { strict: true }), stringToBytes(string));
    });
  }
});

let malformedPadding = ['=', 'Zg=', 'Z===', 'Zm8==', 'Zm9v='];
test('malformed padding', async t => {
  for (let string of malformedPadding) {
    await t.test(JSON.stringify(string), () => {
      assert.throws(() => base64ToUint8Array(string), SyntaxError);
      assert.throws(() => base64ToUint8Array(string, { strict: true }), SyntaxError);
    });
  }
});

let illegal = [
  'Zm.9v',
  'Zm9v^',
  'Zg==&',
  'Z−==', // U+2212 'Minus Sign'
  'Z＋==', // U+FF0B 'Fullwidth Plus Sign'
  'Zg\u00A0==', // nbsp
  'Zg\u2009==', // thin space
  'Zg\u2028==', // line separator
];
test('illegal characters', async t => {
  for (let string of malformedPadding) {
    await t.test(JSON.stringify(string), () => {
      assert.throws(() => base64ToUint8Array(string), SyntaxError);
      assert.throws(() => base64ToUint8Array(string, { strict: true }), SyntaxError);
    });
  }
});

let onlyNonStrict = [
  ['Zg', Uint8Array.of(0x66)],
  ['Zh', Uint8Array.of(0x66)],
  ['Zh==', Uint8Array.of(0x66)],
  ['Zm8', Uint8Array.of(0x66, 0x6f)],
  ['Zm9', Uint8Array.of(0x66, 0x6f)],
  ['Zm9=', Uint8Array.of(0x66, 0x6f)],
];
test('only valid in non-strict', async t => {
  for (let [encoded, decoded] of onlyNonStrict) {
    await t.test(JSON.stringify(encoded), () => {
      assert.deepStrictEqual(base64ToUint8Array(encoded), decoded);
      assert.throws(() => base64ToUint8Array(encoded, { strict: true }), SyntaxError);
    });
  }
});

test('alphabet-specific strings', async t => {
  let standardOnly = 'x+/y';
  await t.test(JSON.stringify(standardOnly), () => {
    assert.deepStrictEqual(base64ToUint8Array(standardOnly), Uint8Array.of(0xc7, 0xef, 0xf2));
    assert.deepStrictEqual(base64ToUint8Array(standardOnly, { alphabet: 'base64' }), Uint8Array.of(0xc7, 0xef, 0xf2));
    assert.throws(() => base64ToUint8Array(standardOnly, { alphabet: 'base64url' }), SyntaxError);
  });

  let urlOnly = 'x-_y';
  await t.test(JSON.stringify(urlOnly), () => {
    assert.deepStrictEqual(base64ToUint8Array(urlOnly, { alphabet: 'base64url' }), Uint8Array.of(0xc7, 0xef, 0xf2));
    assert.throws(() => base64ToUint8Array(urlOnly), SyntaxError);
    assert.throws(() => base64ToUint8Array(urlOnly, { alphabet: 'base64' }), SyntaxError);
  });
});
