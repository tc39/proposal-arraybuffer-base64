# Uint8Array to/from base64 and hex

base64 is a common way to represent arbitrary binary data as ASCII. JavaScript has Uint8Arrays to work with binary data, but no built-in mechanism to encode that data as base64, nor to take base64'd data and produce a corresponding Uint8Arrays. This is a proposal to fix that. It also adds methods for converting between hex strings and Uint8Arrays.

It is currently at Stage 2 of [the TC39 process](https://tc39.es/process-document/).

Try it out on [the playground](https://tc39.github.io/proposal-arraybuffer-base64/).

Initial spec text is available [here](https://tc39.github.io/proposal-arraybuffer-base64/spec/).

## Basic API

```js
let arr = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]);
console.log(arr.toBase64());
// 'SGVsbG8gV29ybGQ='
console.log(arr.toHex());
// '48656c6c6f20576f726c64'
```

```js
let string = 'SGVsbG8gV29ybGQ=';
console.log(Uint8Array.fromBase64(string));
// Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100])

string = '48656c6c6f20576f726c64';
console.log(Uint8Array.fromHex(string));
// Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100])
```

This would add `Uint8Array.prototype.toBase64`/`Uint8Array.prototype.toHex` and `Uint8Array.fromBase64`/`Uint8Array.fromHex` methods. The latter pair would throw if given a string which is not properly encoded.

## Options

An options bag argument for the base64 methods could allow specifying additional details such as the alphabet (to include at least `base64` and `base64url`), whether to generate / enforce padding, and how to handle whitespace.

## Streaming API

Additional `toPartialBase64` and `fromPartialBase64` methods would allow working with chunks of base64, at the cost of more complexity. See [the playground](https://tc39.github.io/proposal-arraybuffer-base64/) linked above for examples.

Streaming versions of the hex APIs are not included since they are straightforward to do manually.

See [issue #13](https://github.com/tc39/proposal-arraybuffer-base64/issues/13) for discussion.

## Questions

### Should these be asynchronous?

In practice most base64'd data I encounter is on the order of hundreds of bytes (e.g. SSH keys), which can be encoded and decoded extremely quickly. It would be a shame to require Promises to deal with such data, I think, especially given that the alternatives people currently use all appear to be synchronous.

Possibly we should have asynchronous versions for working with large data. That is not currently included. For the moment you can use the streaming API to chunk the work.

### What other encodings should be included, if any?

I think base64 and hex are the only encodings which make sense, and those are currently included.

See issues [#7](https://github.com/tc39/proposal-arraybuffer-base64/issues/7), [#8](https://github.com/tc39/proposal-arraybuffer-base64/issues/8), and [#11](https://github.com/tc39/proposal-arraybuffer-base64/issues/11).

### Why not just use `atob` and `btoa`?

Those methods take and consume strings, rather than translating between a string and a Uint8Array.

### Why not TextEncoder?

base64 is not a text encoding format; there's no [code points](https://unicode.org/glossary/#code_point) involved. So despite fitting with the type signature of TextEncoder/TextDecoder, base64 encoding and decoding is not a conceptually appropriate thing for those APIs to do.

That's also been the consensus when it's come up [previously](https://discourse.wicg.io/t/base64-with-textencoder-textdecoder/1307/2).

### What if I just want to encode a portion of an ArrayBuffer?

Uint8Arrays can be partial views of an underlying buffer, so you can create such a view and invoke `.toBase64` on it.

### What if I want to decode a Base64 or hex string into an existing Typed Array or ArrayBuffer?

While that is a reasonable things to want, I think it need not be included in the initial version of this API. We can add it later if demand proves high. Until then, copying slices of memory (e.g. using `target.set(chunk, offset)`) is quite fast.
