let base64Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
let base64UrlCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

let tag = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), Symbol.toStringTag).get;
export function checkUint8Array(arg) {
  let kind;
  try {
    kind = tag.call(arg);
  } catch {
    throw new TypeError('not a Uint8Array');
  }
  if (kind !== 'Uint8Array') {
    throw new TypeError('not a Uint8Array');
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assert failed: ${message}`);
  }
}

function getOptions(options) {
  if (typeof options === 'undefined') {
    return Object.create(null);
  }
  if (options && typeof options === 'object') {
    return options;
  }
  throw new TypeError('options is not object');
}

export function uint8ArrayToBase64(arr, options) {
  checkUint8Array(arr);
  let opts = getOptions(options);
  let alphabet = opts.alphabet;
  if (typeof alphabet === 'undefined') {
    alphabet = 'base64';
  }
  if (alphabet !== 'base64' && alphabet !== 'base64url') {
    throw new TypeError('expected alphabet to be either "base64" or "base64url"');
  }

  let lookup = alphabet === 'base64' ? base64Characters : base64UrlCharacters;
  let result = '';

  let i = 0;
  for (; i + 2 < arr.length; i += 3) {
    let triplet = (arr[i] << 16) + (arr[i + 1] << 8) + arr[i + 2];
    result +=
      lookup[(triplet >> 18) & 63] +
      lookup[(triplet >> 12) & 63] +
      lookup[(triplet >> 6) & 63] +
      lookup[triplet & 63];
  }
  if (i + 2 === arr.length) {
    let triplet = (arr[i] << 16) + (arr[i + 1] << 8);
    result +=
      lookup[(triplet >> 18) & 63] +
      lookup[(triplet >> 12) & 63] +
      lookup[(triplet >> 6) & 63] +
      '=';
  } else if (i + 1 === arr.length) {
    let triplet = arr[i] << 16;
    result +=
      lookup[(triplet >> 18) & 63] +
      lookup[(triplet >> 12) & 63] +
      '==';
  }
  return result;
}

export function base64ToUint8Array(string, options) {
  if (typeof string !== 'string') {
    throw new TypeError('expected input to be a string');
  }
  let opts = getOptions(options);
  let alphabet = opts.alphabet;
  if (typeof alphabet === 'undefined') {
    alphabet = 'base64';
  }
  if (alphabet !== 'base64' && alphabet !== 'base64url') {
    throw new TypeError('expected alphabet to be either "base64" or "base64url"');
  }
  let strict = !!opts.strict;
  let input = string;

  if (!strict) {
    input = input.replaceAll(/[\u0009\u000A\u000C\u000D\u0020]/g, '');
  }
  if (input.length % 4 === 0) {
    if (input.length > 0 && input.at(-1) === '=') {
      input = input.slice(0, -1);
      if (input.length > 0 && input.at(-1) === '=') {
        input = input.slice(0, -1);
      }
    }
  } else if (strict) {
    throw new SyntaxError('not correctly padded');
  }

  let map = new Map((alphabet === 'base64' ? base64Characters : base64UrlCharacters).split('').map((c, i) => [c, i]));
  if ([...input].some(c => !map.has(c))) {
    let bad = [...input].filter(c => !map.has(c));
    throw new SyntaxError(`contains illegal character(s) ${JSON.stringify(bad)}`);
  }

  let lastChunkSize = input.length % 4;
  if (lastChunkSize === 1) {
    throw new SyntaxError('bad length');
  } else if (lastChunkSize === 2 || lastChunkSize === 3) {
    input += 'A'.repeat(4 - lastChunkSize);
  }
  assert(input.length % 4 === 0);

  let result = [];
  let i = 0;
  for (; i < input.length; i += 4) {
    let c1 = input[i];
    let c2 = input[i + 1];
    let c3 = input[i + 2];
    let c4 = input[i + 3];
    let triplet =
      (map.get(c1) << 18) +
      (map.get(c2) << 12) +
      (map.get(c3) << 6) +
      map.get(c4);

    result.push(
      (triplet >> 16) & 255,
      (triplet >> 8) & 255,
      triplet & 255
    );
  }

  if (lastChunkSize === 2) {
    if (strict && result.at(-2) !== 0) {
      throw new SyntaxError('extra bits');
    }
    result.splice(-2, 2);
  } else if (lastChunkSize === 3) {
    if (strict && result.at(-1) !== 0) {
      throw new SyntaxError('extra bits');
    }
    result.pop();
  }

  return new Uint8Array(result);
}

export function uint8ArrayToHex(arr) {
  checkUint8Array(arr);
  let out = '';
  for (let i = 0; i < arr.length; ++i) {
    out += arr[i].toString(16).padStart(2, '0');
  }
  return out;
}

export function hexToUint8Array(string) {
  if (typeof string !== 'string') {
    throw new TypeError('expected string to be a string');
  }
  if (string.length % 2 !== 0) {
    throw new SyntaxError('string should be an even number of characters');
  }
  if (/[^0-9a-fA-F]/.test(string)) {
    throw new SyntaxError('string should only contain hex characters');
  }
  let out = new Uint8Array(string.length / 2);
  for (let i = 0; i < out.length; ++i) {
    out[i] = parseInt(string.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
