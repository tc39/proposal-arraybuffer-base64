import { alphabetFromIdentifier, checkUint8Array, uint8ArrayToBase64, base64ToUint8Array, uint8ArrayToHex, hexToUint8Array } from './polyfill-core.mjs';

function getOptionsObject(opts) {
  if (typeof opts === 'undefined') {
    return { __proto__: null };
  }
  if (opts !== null && typeof opts === 'object') {
    return opts;
  }
  throw new TypeError('bad options object');
}

Uint8Array.prototype.toBase64 = function (opts) {
  checkUint8Array(this);
  let alphabet;
  if (opts && typeof opts === 'object') {
    0, { alphabet } = opts;
  }
  return uint8ArrayToBase64(this, alphabet).result;
};

Uint8Array.prototype.toPartialBase64 = function (opts) {
  checkUint8Array(this);
  let alphabet, more, extra;
  if (opts && typeof opts === 'object') {
    0, { alphabet, more, extra } = opts;
  }
  return uint8ArrayToBase64(this, alphabet, more, extra);
};

Uint8Array.fromBase64 = function (string, opts) {
  if (typeof string !== 'string') {
    throw new Error('expected argument to be a string');
  }
  opts = getOptionsObject(opts);
  let { alphabet: alphabetIdentifier } = opts;
  let alphabet = typeof alphabetIdentifier === 'undefined' ? alphabetFromIdentifier('base64') : alphabetFromIdentifier(alphabetIdentifier);
  return base64ToUint8Array(string, alphabet).result;
};

Uint8Array.fromPartialBase64 = function (string, opts) {
  if (typeof string !== 'string') {
    throw new Error('expected argument to be a string');
  }
  opts = getOptionsObject(opts);
  let { alphabet: alphabetIdentifier, extra, into, inputOffset, outputOffset } = opts;
  let alphabet = typeof alphabetIdentifier === 'undefined' ? alphabetFromIdentifier('base64') : alphabetFromIdentifier(alphabetIdentifier);
  let extraBitCount = 0, extraBits = 0;
  if (extra !== null && typeof extra === 'object') {
    let { count: extraBitCount, bits: extraBits } = extra;
    if (typeof extraBitCount !== 'number' || !(extraBitCount === 0 || extraBitCount === 2 || extraBitCount === 4 || extraBitCount === 6)) {
      throw new TypeError('bit count must be 0, 2, 4, or 6');
    }
    if (typeof extraBits !== 'number' || extraBits < 0 || (extraBits | 0) !== extraBits || (extraBitCount === 0 && extraBits !== 0) || (extraBitCount === 2 && extraBits >= 4) || (extraBitCount === 4 && extraBits >= 16) || (extraBitCount === 6 && extraBits >= 64)) {
      throw new TypeError('bits not well-formed');
    }
  } else if (typeof extra !== 'undefined') {
    throw new TypeError('extra must be an object');
  }
  if (typeof into !== 'undefined') {
    checkUint8Array(into);
  }
  if (typeof inputOffset !== 'undefined') {
    if (typeof inputOffset !== 'number' || Math.floor(inputOffset) !== inputOffset || inputOffset < 0 || inputOffset >= string.length) {
      throw new TypeError('bad inputOffset');
    }
  }
  if (typeof outputOffset !== 'undefined') {
    if (typeof into === 'undefined') {
      throw new TypeError('outputOffset cannot be used with into');
    }
    if (typeof outputOffset !== 'number' || Math.floor(outputOffset) !== outputOffset || outputOffset < 0 || outputOffset >= outputOffset.length) {
      throw new TypeError('bad outputOffset');
    }
  }
  return base64ToUint8Array(string, alphabet, into, extraBitCount, extraBits, inputOffset, outputOffset);
};

Uint8Array.prototype.toHex = function () {
  checkUint8Array(this);
  return uint8ArrayToHex(this);
};

Uint8Array.fromHex = function (string) {
  if (typeof string !== 'string') {
    throw new Error('expected argument to be a string');
  }
  return hexToUint8Array(string);
};
