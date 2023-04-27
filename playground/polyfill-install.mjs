import { checkUint8Array, uint8ArrayToBase64, base64ToUint8Array, uint8ArrayToHex, hexToUint8Array } from './polyfill-core.mjs';

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
  let alphabet;
  if (opts && typeof opts === 'object') {
    0, { alphabet } = opts;
  }
  return base64ToUint8Array(string, alphabet).result;
};

Uint8Array.fromPartialBase64 = function (string, opts) {
  if (typeof string !== 'string') {
    throw new Error('expected argument to be a string');
  }
  let alphabet, more, extra;
  if (opts && typeof opts === 'object') {
    0, { alphabet, more, extra } = opts;
  }
  return base64ToUint8Array(string, alphabet, more, extra);
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
