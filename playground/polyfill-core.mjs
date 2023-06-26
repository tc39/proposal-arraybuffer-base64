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

export function alphabetFromIdentifier(alphabet) {
  if (alphabet === 'base64') {
    return base64Characters;
  } else if (alphabet === 'base64url') {
    return base64UrlCharacters;
  } else {
    throw new TypeError('expected alphabet to be either "base64" or "base64url"');
  }
}

export function uint8ArrayToBase64(arr, alphabetIdentifier = 'base64', more = false, origExtra = null) {
  checkUint8Array(arr);
  let alphabet = alphabetFromIdentifier(alphabetIdentifier);
  more = !!more;
  if (origExtra != null) {
    checkUint8Array(origExtra);
    // a more efficient algorithm would avoid copying
    // but writing that out is unclear / a pain
    // the difference is not observable
    let copy = new Uint8Array(arr.length + origExtra.length);
    copy.set(origExtra);
    copy.set(arr, origExtra.length);
    arr = copy;
  }
  let result = '';

  let i = 0;
  for (; i + 2 < arr.length; i += 3) {
    let triplet = (arr[i] << 16) + (arr[i + 1] << 8) + arr[i + 2];
    result +=
      alphabet[(triplet >> 18) & 63] +
      alphabet[(triplet >> 12) & 63] +
      alphabet[(triplet >> 6) & 63] +
      alphabet[triplet & 63];
  }
  if (more) {
    let extra = arr.slice(i); // TODO should this be a view, or a copy?
    return { result, extra };
  } else {
    if (i + 2 === arr.length) {
      let triplet = (arr[i] << 16) + (arr[i + 1] << 8);
      result +=
        alphabet[(triplet >> 18) & 63] +
        alphabet[(triplet >> 12) & 63] +
        alphabet[(triplet >> 6) & 63] +
        '=';
    } else if (i + 1 === arr.length) {
      let triplet = arr[i] << 16;
      result +=
        alphabet[(triplet >> 18) & 63] +
        alphabet[(triplet >> 12) & 63] +
        '==';
    }
    return { result, extra: null };
  }
}

// this is extremely inefficient, but easy to reason about
// actual implementations should use something more efficient except possibly at boundaries
function decodeOneBase64Character(extraBitCount, extraBits, alphabetMap, char) {
  let val = alphabetMap.get(char);
  switch (extraBitCount) {
    case 0: {
      // i.e., this is the first of 4 characters
      return { extraBitCount: 6, extraBits: val, byte: null };
    }
    case 2: {
      // i.e., this is the 4th of 4 characters
      return { extraBitCount: 0, extraBits: 0, byte: (extraBits << 6) | val };
    }
    case 4: {
      // i.e., this is the 3rd of 4 characters
      return { extraBitCount: 2, extraBits: val & 0b11, byte: (extraBits << 4) | ((val & 0b111100) >> 2) };
    }
    case 6: {
      // i.e., this is the 2nd of 4 characters
      return { extraBitCount: 4, extraBits: val & 0b1111, byte: (extraBits << 2) | ((val & 0b110000) >> 4) };
    }
    default: {
      throw new Error(`unreachable: extraBitCount ${extraBitCount}`);
    }
  }
}


// TODO simplify
function countFullBytesInBase64StringIncludingExtraBits(str, extraBitCount) {
  if (str === '=' && extraBitCount === 0) {
    // special case arising when a `=` char is the second half of a `==` pair
    return 0;
  }
  let paddingCharCount = str.endsWith('==') ? 2 : str.endsWith('=') ? 1 : 0;
  let fullChunks = Math.floor((str.length - paddingCharCount) / 4);
  let bytesFromFullChunks = fullChunks * 3;
  if (paddingCharCount === 2) {
    let extraCharCount = (str.length - 2) % 4;
    let isCorrectlyPadded =
      (extraCharCount === 0 && extraBitCount === 4)
      || (extraCharCount === 1 && extraBitCount === 6)
      || (extraCharCount === 2 && extraBitCount === 0)
      || (extraCharCount === 3 && extraBitCount === 2);
    if (!isCorrectlyPadded) {
      throw new Error('string is incorrectly padded');
    }
    let bytesFromExtraChars =
      extraCharCount === 0 ? 0
      : extraCharCount === 1 ? 1
      : extraCharCount === 2 ? 1
      : extraCharCount === 3 ? 2
      : unreachable();
    return bytesFromFullChunks + bytesFromExtraChars;
  } else if (paddingCharCount === 1) {
    let extraCharCount = (str.length - 1) % 4;
    let isCorrectlyPadded = // the '||' cases arise when the string is cut off halfway through a `==` pair
      (extraCharCount === 0 && (extraBitCount === 2 || extraBitCount === 4))
      || (extraCharCount === 1 && (extraBitCount === 4 || extraBitCount === 6))
      || (extraCharCount === 2 && (extraBitCount === 6 || extraBitCount === 0))
      || (extraCharCount === 3 && (extraBitCount === 0 || extraBitCount === 2));
    if (!isCorrectlyPadded) {
      throw new Error('string is incorrectly padded');
    }
    let bytesFromExtraChars =
      extraCharCount === 0 ? 0
      : extraCharCount === 1 ? 1
      : extraCharCount === 2 ? (extraBitCount === 6 ? 2 : 1)
      : extraCharCount === 3 ? 2
      : unreachable();
    return bytesFromFullChunks + bytesFromExtraChars;
  } else {
    let extraCharCount = (str.length) % 4;
    let bytesFromExtraChars =
      extraCharCount === 0 ? 0 // 0 bits from overflow, plus extra bits
      : extraCharCount === 1 ? (extraBitCount === 0 ? 0 : 1) // 6 bits from overflow, plus extra bits
      : extraCharCount === 2 ? (extraBitCount === 4 || extraBitCount === 6 ? 2 : 1) // 12 bits from overflow, plus extra bits
      : extraCharCount === 3 ? (extraBitCount === 6 ? 3 : 2) // 18 bits from overflow, plus extra bits
      : unreachable();
    return bytesFromFullChunks + bytesFromExtraChars;
  }
}

export function base64ToUint8Array(str, alphabet, into = null, extraBitCount = 0, extraBits = 0, inputOffset = 0, outputOffset = 0) {
  let alphabetMap = new Map(alphabet.split('').map((c, i) => [c, i]));
  str = str.slice(inputOffset);
  let codepoints = [...str]; // NB does not validate characters before inputOffset - should it? probably already been validated, but might be faster to just run on the whole string
  if (codepoints.some(((c, i) => c === '=' && !(i === codepoints.length - 1 || i === codepoints.length - 2) || c !== '=' && !alphabetMap.has(c)))) {
    throw new Error('bad character');
  }
  let totalBytesForChunk = countFullBytesInBase64StringIncludingExtraBits(str, extraBitCount); // also kinda validates padding, if present
  let bytesToWrite;
  let outputIndex;
  if (into == null) {
    into = new Uint8Array(totalBytesForChunk);
    bytesToWrite = totalBytesForChunk;
  } else {
    bytesToWrite = Math.min(into.length - outputOffset, totalBytesForChunk);
    // TODO error if bytesToWrite is ≤ 0, maybe?
  }
  let byte;
  let written = 0;
  let read = 0;
  while (written < bytesToWrite) {
    let char = str[read];
    if (char === '=') {
      throw new Error('unreachable');
    }
    0, { extraBitCount, extraBits, byte } = decodeOneBase64Character(extraBitCount, extraBits, alphabetMap, char);
    ++read;
    if (byte != null) {
      into[outputOffset + written] = byte;
      ++written;
    }
  }
  if (read < str.length && str[read] === '=') {
    read = str.length;
    // TODO if we want to be really pedantic, check extraBits === 0 here
    if (extraBitCount === 0 || extraBitCount === 6) {
      throw new Error('unreachable: malformed padding (checked earlier)');
    }
  }
  if (read < str.length && extraBitCount === 0) {
    // we can read one more character and store it in extra
    let char = str[read];
    0, { extraBitCount, extraBits } = decodeOneBase64Character(extraBitCount, extraBits, alphabetMap, char);
    ++read;
  }
  let extra = extraBitCount === 0 ? void 0 : { count: extraBitCount, bits: extraBits };
  return { result: into, read, written, extra };
}

export function uint8ArrayToHex(arr) {
  checkUint8Array(arr);
  let out = '';
  for (let i = 0; i < arr.length; ++i) {
    out += arr[i].toString(16).padStart(2, '0');
  }
  return out;
}

export function hexToUint8Array(str) {
  if (typeof str !== 'string') {
    throw new TypeError('expected str to be a string');
  }
  if (str.length % 2 !== 0) {
    throw new SyntaxError('str should be an even number of characters');
  }
  if (/[^0-9a-zA-Z]/.test(str)) {
    throw new SyntaxError('str should only contain hex characters');
  }
  let out = new Uint8Array(str.length / 2);
  for (let i = 0; i < out.length; ++i) {
    out[i] = parseInt(str.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
