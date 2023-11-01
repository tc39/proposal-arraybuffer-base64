import './playground/polyfill-install.mjs';

let whitespace = new Set(['\u0009', '\u000A', '\u000C', '\u000D', '\u0020']);

// This mirrors the somewhat awkward TextDecoder API.
// Better designs are of course possible.
class Base64Decoder {
  #options;
  #extra;
  constructor(options) {
    this.#options = options;
    this.#extra = '';
  }

  decode(chunk = '', options = {}) {
    let stream = options.stream ?? false;
    chunk = this.#extra + chunk;
    this.#extra = '';

    if (!stream) {
      return Uint8Array.fromBase64(chunk, this.#options);
    }

    let realCharacterCount = 0;
    let hasWhitespace = false;
    for (let i = 0; i < chunk.length; ++i) {
      if (whitespace.has(chunk[i])) {
        hasWhitespace = true;
      } else {
        ++realCharacterCount;
      }
    }

    // requires 1 additional pass over `chunk`, plus one additional copy of `chunk`
    let extraCharacterCount = realCharacterCount % 4;
    if (extraCharacterCount !== 0) {
      if (!hasWhitespace) {
        this.#extra = chunk.slice(-extraCharacterCount);
        chunk = chunk.slice(0, -extraCharacterCount);
      } else {
        // need to do a bit more work to figure out where to slice
        let collected = 0;
        let i = chunk.length - 1;
        while (true) {
          if (!whitespace.has(chunk[i])) {
            ++collected;
            if (collected === extraCharacterCount) {
              break;
            }
          }
          --i;
        }
        this.#extra = chunk.slice(i);
        chunk = chunk.slice(0, i);
      }
    }

    return Uint8Array.fromBase64(chunk, this.#options);
  }
}


class Base64Encoder {
  #options;
  #extra;
  #extraLength;
  constructor(options) {
    this.#options = options;
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
