import './playground/polyfill-install.mjs';

// This mirrors the somewhat awkward TextDecoder API.
// Better designs are of course possible.
class Base64Decoder {
  #extra;
  constructor() {
    this.#extra = '';
  }

  decode(chunk = '', options = {}) {
    let opts = { ...options };
    // match TextEncoder API
    if (opts.stream) {
      opts.onlyFullChunks = true;
    }
    chunk = this.#extra + chunk;
    this.#extra = '';
    let result = Uint8Array.fromBase64(chunk, opts);
    this.#extra = result.extraBase64Chars ?? '';
    return result;
  }
}


class Base64Encoder {
  #extra;
  #extraLength;
  constructor() {
    this.#extra = new Uint8Array(3);
    this.#extraLength = 0;
  }

  // partly derived from https://github.com/lucacasonato/base64_streams/blob/main/src/iterator/encoder.ts
  encode(chunk = Uint8Array.of(), options = {}) {
    let stream = options.stream ?? false;

    if (this.#extraLength > 0) {
      let bytesNeeded = 3 - this.#extraLength;
      let bytesAvailable = Math.min(bytesNeeded, chunk.length);
      this.#extra.set(chunk.subarray(0, bytesAvailable), this.#extraLength);
      chunk = chunk.subarray(bytesAvailable);
      this.#extraLength += bytesAvailable;
    }

    if (!stream) {
      // assert: this.#extraLength.length === 0 || this.#extraLength === 3 || chunk.length === 0
      let prefix = this.#extra.subarray(0, this.#extraLength).toBase64();
      this.#extraLength = 0;
      return prefix + chunk.toBase64();
    }

    let extraReturn = '';

    if (this.#extraLength === 3) {
      extraReturn = this.#extra.toBase64();
      this.#extraLength = 0;
    }

    let remainder = chunk.length % 3;
    if (remainder > 0) {
      this.#extra.set(chunk.subarray(chunk.length - remainder));
      this.#extraLength = remainder;
      chunk = chunk.subarray(0, chunk.length - remainder);
    }

    return extraReturn + chunk.toBase64();
  }
}

let decoder = new Base64Decoder();

console.log(decoder.decode('SG  Vsb', { stream: true }));
console.log(decoder.decode('G8gV29ybGR', { stream: true }));
console.log(decoder.decode());


let encoder = new Base64Encoder();

console.log(encoder.encode(Uint8Array.of(72, 101, 108, 108, 111), { stream: true }));
console.log(encoder.encode(Uint8Array.of(32, 87, 111, 114, 108, 100), { stream: true }));
console.log(encoder.encode());


console.log(Uint8Array.fromBase64('SGVsbG8gV29ybGQ', { onlyFullChunks: true, strict: true }))
