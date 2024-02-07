import './playground/polyfill-install.mjs';

// This mirrors the somewhat awkward TextDecoder API.
// Better designs are of course possible.
class Base64Decoder {
  #extra = '';

  decode(chunk = '', options = {}) {
    let opts = { ...options };
    // match TextEncoder API
    if (opts.stream) {
      opts.lastChunkHandling = 'stop-before-partial';
    }
    chunk = this.#extra + chunk;
    this.#extra = '';
    // for simplicity, allocate new memory every time
    // the calculation below is guaranteed to be enough,
    // but may be too much if there is whitespace
    // if you're really concerned about memory, a TextDecoder style API is a bad choice
    let buffer = new Uint8Array(Math.ceil(chunk.length * 3 / 4));
    let { read, written } = buffer.setFromBase64(chunk, opts);
    buffer = buffer.subarray(0, written);
    this.#extra = chunk.slice(read);
    return buffer;
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

console.log(decoder.decode('SG Vsb ', { stream: true }));
console.log(decoder.decode('G8gV29ybGR ', { stream: true }));
console.log(decoder.decode(''));


let encoder = new Base64Encoder();

console.log(encoder.encode(Uint8Array.of(72, 101, 108, 108, 111), { stream: true }));
console.log(encoder.encode(Uint8Array.of(32, 87, 111, 114, 108, 100), { stream: true }));
console.log(encoder.encode());
