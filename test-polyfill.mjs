import test from 'node:test';
import assert from 'node:assert';

import './playground/polyfill-install.mjs';

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
      assert.strictEqual(stringToBytes(string).toBase64(), result);

      assert.deepStrictEqual(Uint8Array.fromBase64(result), stringToBytes(string));
      assert.deepStrictEqual(Uint8Array.fromBase64(result, { lastChunkHandling: 'strict' }), stringToBytes(string));
    });
  }
});

test('omitPadding', async t => {
  for (let [string, result] of standardBase64Vectors) {
    await t.test(JSON.stringify(string), () => {
      assert.strictEqual(stringToBytes(string).toBase64({ omitPadding: true }), result.replace(/=/g, ''));
    });
  }
});

let malformedPadding = ['=', 'Zg=', 'Z===', 'Zm8==', 'Zm9v='];
test('malformed padding', async t => {
  for (let string of malformedPadding) {
    await t.test(JSON.stringify(string), () => {
      assert.throws(() => Uint8Array.fromBase64(string), SyntaxError);
      assert.throws(() => Uint8Array.fromBase64(string, { lastChunkHandling: 'strict' }), SyntaxError);
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
      assert.throws(() => Uint8Array.fromBase64(string), SyntaxError);
      assert.throws(() => Uint8Array.fromBase64(string, { lastChunkHandling: 'strict' }), SyntaxError);
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
      assert.deepStrictEqual(Uint8Array.fromBase64(encoded), decoded);
      assert.throws(() => Uint8Array.fromBase64(encoded, { lastChunkHandling: 'strict' }), SyntaxError);
    });
  }
});

test('alphabet-specific strings', async t => {
  let standardOnly = 'x+/y';

  await t.test(JSON.stringify(standardOnly), () => {
    assert.deepStrictEqual(Uint8Array.fromBase64(standardOnly), Uint8Array.of(0xc7, 0xef, 0xf2));
    assert.deepStrictEqual(Uint8Array.fromBase64(standardOnly, { alphabet: 'base64' }), Uint8Array.of(0xc7, 0xef, 0xf2));
    assert.throws(() => Uint8Array.fromBase64(standardOnly, { alphabet: 'base64url' }), SyntaxError);
  });

  let urlOnly = 'x-_y';
  await t.test(JSON.stringify(urlOnly), () => {
    assert.deepStrictEqual(Uint8Array.fromBase64(urlOnly, { alphabet: 'base64url' }), Uint8Array.of(0xc7, 0xef, 0xf2));
    assert.throws(() => Uint8Array.fromBase64(urlOnly), SyntaxError);
    assert.throws(() => Uint8Array.fromBase64(urlOnly, { alphabet: 'base64' }), SyntaxError);
  });
});

test('valid data before invalid data is written', async t => {
  let input = 'Zm9vYmFyxx!';
  let target = new Uint8Array(9);

  assert.throws(() => target.setFromBase64(input), SyntaxError);
  assert.deepStrictEqual(target, Uint8Array.of(102, 111, 111, 98, 97, 114, 0, 0, 0));
});

test('writing to an existing buffer', async t => {
  let foobarInput = 'Zm9vYmFy';
  let foobaInput = 'Zm9vYmE';
  let foobarOutput = [102, 111, 111, 98, 97, 114];

  await t.test('buffer exact', () => {
    let output = new Uint8Array(6);
    let { read, written } = output.setFromBase64(foobarInput);
    assert.deepStrictEqual([...output], foobarOutput);
    assert.deepStrictEqual({ read, written }, { read: 8, written: 6 });
  });

  await t.test('buffer too large', () => {
    let output = new Uint8Array(8);
    let { read, written } = output.setFromBase64(foobarInput);
    assert.deepStrictEqual([...output], [...foobarOutput, 0, 0]);
    assert.deepStrictEqual({ read, written }, { read: 8, written: 6 });
  });

  await t.test('buffer too small', () => {
    let output = new Uint8Array(5);
    let { read, written } = output.setFromBase64(foobarInput);
    assert.deepStrictEqual([...output], [...foobarOutput.slice(0, 3), 0, 0]);
    assert.deepStrictEqual({ read, written }, { read: 4, written: 3 });
  });

  await t.test('buffer exact, padded', () => {
    let output = new Uint8Array(5);
    let { read, written } = output.setFromBase64(foobaInput + '=');
    assert.deepStrictEqual([...output], foobarOutput.slice(0, 5));
    assert.deepStrictEqual({ read, written }, { read: 8, written: 5 });
  });

  await t.test('buffer exact, not padded', () => {
    let output = new Uint8Array(5);
    let { read, written } = output.setFromBase64(foobaInput);
    assert.deepStrictEqual([...output], foobarOutput.slice(0, 5));
    assert.deepStrictEqual({ read, written }, { read: 7, written: 5 });
  });

  await t.test('buffer exact, padded, stop-before-partial', () => {
    let output = new Uint8Array(5);
    let { read, written } = output.setFromBase64(foobaInput + '=', { lastChunkHandling: 'stop-before-partial' });
    assert.deepStrictEqual([...output], foobarOutput.slice(0, 5));
    assert.deepStrictEqual({ read, written }, { read: 8, written: 5 });
  });

  await t.test('buffer exact, not padded, stop-before-partial', () => {
    let output = new Uint8Array(5);
    let { read, written } = output.setFromBase64(foobaInput, { lastChunkHandling: 'stop-before-partial' });
    assert.deepStrictEqual([...output], [...foobarOutput.slice(0, 3), 0, 0]);
    assert.deepStrictEqual({ read, written }, { read: 4, written: 3 });
  });

  await t.test('buffer too small, padded', () => {
    let output = new Uint8Array(4);
    let { read, written } = output.setFromBase64(foobaInput + '=');
    assert.deepStrictEqual([...output], [...foobarOutput.slice(0, 3), 0]);
    assert.deepStrictEqual({ read, written }, { read: 4, written: 3 });
  });

  await t.test('buffer too large, trailing whitespace', () => {
    let output = new Uint8Array(8);
    let { read, written } = output.setFromBase64(foobarInput + ' '.repeat(10));
    assert.deepStrictEqual([...output], [...foobarOutput, 0, 0]);
    assert.deepStrictEqual({ read, written }, { read: 18, written: 6 });
  });

  await t.test('buffer too large, not padded, trailing whitespace', () => {
    let output = new Uint8Array(8);
    let { read, written } = output.setFromBase64(foobaInput + ' '.repeat(10));
    assert.deepStrictEqual([...output], [...foobarOutput.slice(0, 5), 0, 0, 0]);
    assert.deepStrictEqual({ read, written }, { read: 17, written: 5 });
  });
});

test('stop-before-partial', async t => {
  let foobaInput = 'Zm9vYmE';
  let foobarOutput = [102, 111, 111, 98, 97, 114];

  await t.test('no padding', () => {
    let output = Uint8Array.fromBase64(foobaInput, { lastChunkHandling: 'stop-before-partial' });
    assert.deepStrictEqual([...output], foobarOutput.slice(0, 3));
  });

  await t.test('padding', () => {
    let output = Uint8Array.fromBase64(foobaInput + '=', { lastChunkHandling: 'stop-before-partial' });
    assert.deepStrictEqual([...output], foobarOutput.slice(0, 5));
  });

  await t.test('no padding, trailing whitespace', () => {
    let output = new Uint8Array(8);
    let { read, written } = output.setFromBase64(foobaInput + ' '.repeat(10), { lastChunkHandling: 'stop-before-partial' });
    assert.deepStrictEqual([...output], [...foobarOutput.slice(0, 3), 0, 0, 0, 0, 0]);
    assert.deepStrictEqual({ read, written }, { read: 4, written: 3 });
  });
});

test('hex', async t => {
  let encoded = 'deadBEEF';
  let decoded = [222, 173, 190, 239];

  await t.test('basic decode', () => {
    assert.deepStrictEqual([...Uint8Array.fromHex(encoded)], decoded);
  });

  await t.test('decode into, exact', () => {
    let output = new Uint8Array(4);
    let { read, written } = output.setFromHex(encoded);
    assert.deepStrictEqual([...output], decoded);
    assert.deepStrictEqual({ read, written }, { read: 8, written: 4 });
  });

  await t.test('decode into, buffer too large', () => {
    let output = new Uint8Array(6);
    let { read, written } = output.setFromHex(encoded);
    assert.deepStrictEqual([...output], [...decoded, 0, 0]);
    assert.deepStrictEqual({ read, written }, { read: 8, written: 4 });
  });

  await t.test('decode into, buffer too small', () => {
    let output = new Uint8Array(3);
    let { read, written } = output.setFromHex(encoded);
    assert.deepStrictEqual([...output], decoded.slice(0, 3));
    assert.deepStrictEqual({ read, written }, { read: 6, written: 3 });
  });
});

test('valid data before invalid data is written', async t => {
  let input = 'deadbeef!!';
  let target = new Uint8Array(6);

  assert.throws(() => target.setFromHex(input), SyntaxError);
  assert.deepStrictEqual(target, Uint8Array.of(222, 173, 190, 239, 0, 0));
});
