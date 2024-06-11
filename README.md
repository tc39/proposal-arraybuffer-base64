# Uint8Array to/from base64 and hex

base64 is a common way to represent arbitrary binary data as ASCII. JavaScript has Uint8Arrays to work with binary data, but no built-in mechanism to encode that data as base64, nor to take base64'd data and produce a corresponding Uint8Arrays. This is a proposal to fix that. It also adds methods for converting between hex strings and Uint8Arrays.

It is currently at stage 3 of [the TC39 process](https://tc39.es/process-document/): it is ready for implementations. See [this issue](https://github.com/tc39/proposal-arraybuffer-base64/issues/51) for current status.

Try it out on [the playground](https://tc39.github.io/proposal-arraybuffer-base64/).

Spec text is available [here](https://tc39.github.io/proposal-arraybuffer-base64/spec/), and test262 tests in [this PR](https://github.com/tc39/test262/pull/3994).

Implementers may be interested in [the open-source simdutf library](https://github.com/simdutf/simdutf/?tab=readme-ov-file#base64), which provides a fast implementation of a base64 decoder which matches `Uint8Array.fromBase64(string)` (including handling of whitespace) when it is called without specifying any options. As of this writing it only works on latin1 strings, but a utf16 version [may be coming](https://github.com/simdutf/simdutf/pull/375#issuecomment-2016979707).

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

## Base64 options

Additional options are supplied in an options bag argument:

- `alphabet`: Allows specifying the alphabet as either `base64` or `base64url`.

- `lastChunkHandling`: Recall that base64 decoding operates on chunks of 4 characters at a time, but the input may have some characters which don't fit evenly into such a chunk of 4 characters. This option determines how the final chunk of characters should be handled. The three options are `"loose"` (the default), which treats the chunk as if it had any necessary `=` padding (but throws if this is not possible, i.e. there is exactly one extra character); `"strict"`, which enforces that the chunk has exactly 4 characters (counting `=` padding) and that [overflow bits](https://datatracker.ietf.org/doc/html/rfc4648#section-3.5) are 0; and `"stop-before-partial"`, which stops decoding before the final chunk unless the final chunk has exactly 4 characters.

- `omitPadding`: When encoding, whether to include `=` padding. Defaults to `false`, i.e., padding is included.

The hex methods do not take any options.

## Writing to an existing Uint8Array

The `Uint8Array.prototype.setFromBase64` method allows writing to an existing Uint8Array. Like the [TextEncoder `encodeInto` method](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/encodeInto), it returns a `{ read, written }` pair.

```js
let target = new Uint8Array(8);
let { read, written } = target.setFromBase64('Zm9vYmFy');
assert.deepStrictEqual([...target], [102, 111, 111, 98, 97, 114, 0, 0]);
assert.deepStrictEqual({ read, written }, { read: 8, written: 6 });
```

This method takes an optional final options bag with the same options as above.

As with `encodeInto`, there is not explicit support for writing to specified offset of the target, but you can accomplish that by creating a subarray.

`Uint8Array.prototype.setFromHex` is the same except for hex.

## Streaming

There is no explicit support for streaming. However, it is [relatively straightforward to do effeciently in userland](./stream.mjs) on top of this API, with support for all the same options as the underlying functions.

## FAQ

### What variation exists among base64 implementations in standards, in other languages, and in existing JavaScript libraries?

I have a [whole page on that](./base64.md), with tables and footnotes and everything. There is relatively little room for variation, but languages and libraries manage to explore almost all of the room there is.

To summarize, base64 encoders can vary in the following ways:

- Standard or URL-safe alphabet
- Whether `=` is included in output
- Whether to add linebreaks after a certain number of characters

and decoders can vary in the following ways:

- Standard or URL-safe alphabet
- Whether `=` is required in input, and how to handle malformed padding (e.g. extra `=`)
- Whether to fail on non-zero padding bits
- Whether lines must be of a limited length
- How non-base64-alphabet characters are handled (sometimes with special handling for only a subset, like whitespace)

### What alphabets are supported?

For base64, you can specify either base64 or base64url for both the encoder and the decoder.

For hex, both lowercase and uppercase characters (including mixed within the same string) will decode successfully. Output is always lowercase.

### How are the extra padding bits handled?

If the length of your input data isn't exactly a multiple of 3 bytes, then encoding it will use either 2 or 3 base64 characters to encode the final 1 or 2 bytes. Since each base64 character is 6 bits, this means you'll be using either 12 or 18 bits to represent 8 or 16 bits, which means you have an extra 4 or 2 bits which don't encode anything.

Per [the RFC](https://datatracker.ietf.org/doc/html/rfc4648#section-3.5), decoders MAY reject input strings where the padding bits are non-zero. Here, non-zero padding bits are silently ignored unless `lastChunkHandling: "strict"` is specified.

### How is whitespace handled?

The encoders do not output whitespace. The hex decoder does not allow it as input. The base64 decoder allows [ASCII whitespace](https://infra.spec.whatwg.org/#ascii-whitespace) anywhere in the string.

### How are other characters handled?

The presence of any other characters causes an exception.

### Why are these synchronous?

In practice most base64'd data I encounter is on the order of hundreds of bytes (e.g. SSH keys), which can be encoded and decoded extremely quickly. It would be a shame to require Promises to deal with such data, I think, especially given that the alternatives people currently use all appear to be synchronous.

### Why just these encodings?

While other string encodings exist, none are nearly as commonly used as these two.

See issues [#7](https://github.com/tc39/proposal-arraybuffer-base64/issues/7), [#8](https://github.com/tc39/proposal-arraybuffer-base64/issues/8), and [#11](https://github.com/tc39/proposal-arraybuffer-base64/issues/11).

### Why not just use `atob` and `btoa`?

Those methods take and consume strings, rather than translating between a string and a Uint8Array.

### Why not TextEncoder?

base64 is not a text encoding format; there's no [code points](https://unicode.org/glossary/#code_point) involved. So despite fitting with the type signature of TextEncoder/TextDecoder, base64 encoding and decoding is not a conceptually appropriate thing for those APIs to do.

That's also been the consensus when it's come up [previously](https://discourse.wicg.io/t/base64-with-textencoder-textdecoder/1307/2).

### What if I just want to encode a portion of an ArrayBuffer?

Uint8Arrays can be partial views of an underlying buffer, so you can create such a view and invoke `.toBase64` on it.
