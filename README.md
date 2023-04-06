# Uint8Array to/from base64

base64 is a common way to represent arbitrary binary data as ASCII. JavaScript has Uint8Arrays to work with binary data, but no built-in mechanism to encode that data as base64, nor to take base64'd data and produce a corresponding Uint8Arrays. This is a proposal to fix that.

It is currently at Stage 1 of [the TC39 process](https://tc39.es/process-document/).

Try it out on [the playground](https://tc39.github.io/proposal-arraybuffer-base64/).

## Basic API

```js
let arr = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]);
console.log(arr.toBase64());
// 'SGVsbG8gV29ybGQ='
```

```js
let string = 'SGVsbG8gV29ybGQ=';
console.log(Uint8Array.fromBase64(string));
// Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100])
```

This would add `Uint8Array.prototype.toBase64` and `Uint8Array.fromBase64` methods. The latter would throw if given a string which is not properly base64 encoded.

## Options

An options bag argument could allow specifying additional details such as the alphabet (to include at least `base64` and `base64url`), whether to generate / enforce padding, and how to handle whitespace.

## Streaming API

Additional `toPartialBase64` and `fromPartialBase64` methods would allow working with chunks of base64, at the cost of more complexity. See [the playground](https://tc39.github.io/proposal-arraybuffer-base64/) linked above for examples.

See [issue #13](https://github.com/tc39/proposal-arraybuffer-base64/issues/13) for discussion.

## Questions

### Should these be asynchronous?

In practice most base64'd data I encounter is on the order of hundreds of bytes (e.g. SSH keys), which can be encoded and decoded extremely quickly. It would be a shame to require Promises to deal with such data, I think, especially given that the alternatives people currently use all appear to be synchronous.

Possibly we should have asynchronous versions for working with large data.

### What other encodings should be included, if any?

I think hex makes sense, and no others. Hex is not yet implemented in the playground. The current plan is for new encodings to be added as seperate methods.

See issues [#7](https://github.com/tc39/proposal-arraybuffer-base64/issues/7), [#8](https://github.com/tc39/proposal-arraybuffer-base64/issues/8), and [#11](https://github.com/tc39/proposal-arraybuffer-base64/issues/11).

### Why not just use `atob` and `btoa`?

Those methods are take and consume strings, rather than translating between a string and a Uint8Array.

### Why not TextEncoder?

base64 is not a text encoding format; there's no [code points](https://unicode.org/glossary/#code_point) involved. So despite fitting with the type signature of TextEncoder/TextDecoder, base64 encoding and decoding is not a conceptually appropriate thing for those APIs to do.

That's also been the consensus when it's come up [previously](https://discourse.wicg.io/t/base64-with-textencoder-textdecoder/1307/2).

### What if I just want to encode a portion of an ArrayBuffer?

Uint8Arrays can be partial views of an underlying buffer, so you can create such a view and invoke `.toBase64` on it.

### What if I want to decode a Base64 string into an existing Typed Array or ArrayBuffer?

While that is a reasonable things to want, I think it need not be included in the initial version of this API. We can add it later if demand proves high. Until then, copying slices of memory (e.g. using `target.set(chunk, offset)`) is quite fast.
