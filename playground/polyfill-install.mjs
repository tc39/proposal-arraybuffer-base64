import { uint8ArrayToBase64, base64ToUint8Array, uint8ArrayToHex, hexToUint8Array } from './polyfill-core.mjs';

Uint8Array.prototype.toBase64 = function (options) {
  return uint8ArrayToBase64(this, options);
};

Uint8Array.fromBase64 = function (string, options) {
  return base64ToUint8Array(string, options);
};

Uint8Array.prototype.toHex = function () {
  return uint8ArrayToHex(this);
};

Uint8Array.fromHex = function (string) {
  return hexToUint8Array(string);
};
