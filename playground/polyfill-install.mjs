import { uint8ArrayToBase64, base64ToUint8Array, uint8ArrayToHex, hexToUint8Array, checkUint8Array } from './polyfill-core.mjs';

Uint8Array.prototype.toBase64 = function (options) {
  return uint8ArrayToBase64(this, options);
};

Uint8Array.fromBase64 = function (string, options) {
  if (typeof string !== 'string') {
    throw new TypeError('expected input to be a string');
  }
  return base64ToUint8Array(string, options).bytes;
};

Uint8Array.fromBase64Into = function (string, into, options) {
  if (typeof string !== 'string') {
    throw new TypeError('expected input to be a string');
  }
  checkUint8Array(into);
  let { read, bytes } = base64ToUint8Array(string, options, into);
  return { read, written: bytes.length };
};

Uint8Array.prototype.toHex = function () {
  return uint8ArrayToHex(this);
};

Uint8Array.fromHex = function (string) {
  if (typeof string !== 'string') {
    throw new TypeError('expected input to be a string');
  }
  return hexToUint8Array(string).bytes;
};

Uint8Array.fromHexInto = function (string, into, options) {
  if (typeof string !== 'string') {
    throw new TypeError('expected input to be a string');
  }
  checkUint8Array(into);
  let { read, bytes } = hexToUint8Array(string, options, into);
  return { read, written: bytes.length };
};
