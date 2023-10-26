# Notes on Base64 as it exists

Towards an implementation in JavaScript.

## The RFCs

There are two RFCs which are still generally relevant in modern times: [4648](https://datatracker.ietf.org/doc/html/rfc4648), which defines only the base64 and base64url encodings, and [2045](https://datatracker.ietf.org/doc/html/rfc2045#section-6.8), which defines [MIME](https://en.wikipedia.org/wiki/MIME) and includes a base64 encoding.

RFC 4648 is "the base64 RFC". It obsoletes RFC [3548](https://datatracker.ietf.org/doc/html/rfc3548).

- It defines both the standard (`+/`) and url-safe (`-_`) alphabets.
- "Implementations MUST include appropriate pad characters at the end of encoded data unless the specification referring to this document explicitly states otherwise." Certain malformed padding MAY be ignored.
- "Decoders MAY chose to reject an encoding if the pad bits have not been set to zero"
- "Implementations MUST reject the encoded data if it contains characters outside the base alphabet when interpreting base-encoded data, unless the specification referring to this document explicitly states otherwise."

RFC 2045 is not usually relevant, but it's worth summarizing its behavior anyway:

- Only the standard (`+/`) alphabet is supported.
- It defines only an encoding. The encoding is specified to include `=`. No direction is given for decoders which encounter data which is not padded with `=`, or which has non-zero padding bits. In practice, decoders seem to ignore both.
- "Any characters outside of the base64 alphabet are to be ignored in base64-encoded data."
- MIME requires lines of length at most 76 characters, seperated by CRLF.

RFCs [1421](https://datatracker.ietf.org/doc/html/rfc1421) and [7468](https://datatracker.ietf.org/doc/html/rfc7468), which define "Privacy-Enhanced Mail" and related things (think `-----BEGIN PRIVATE KEY-----`), are basically identical to the above except that they mandate lines of exactly 64 characters, except that the last line may be shorter.

RFC [4880](https://datatracker.ietf.org/doc/html/rfc4880#section-6) defines OpenPGP messages and is just the RFC 2045 format plus a checksum. In practice, only whitespace is ignored, not all non-base64 characters.

No other variations are contemplated in any other RFC or implementation that I'm aware of. That is, we have the following ways that base64 encoders can vary:

- Standard or URL-safe alphabet
- Whether `=` is included in output
- Whether to add linebreaks after a certain number of characters

and the following ways that base64 decoders can vary:

- Standard or URL-safe alphabet
- Whether `=` is required in input, and how to handle malformed padding (e.g. extra `=`)
- Whether to fail on non-zero padding bits
- Whether lines must be of a limited length
- How non-base64-alphabet characters are handled (sometimes with special handling for only a subset, like whitespace)

## Programming languages

Note that neither C++ nor Rust have built-in base64 support. In C++ the Boost library is quite common in large projects and parts sometimes get pulled in to the standard library, and in Rust the [base64 crate](https://docs.rs/base64/latest/base64/) is the clear choice of everyone, so I'm mentioning those as well.

"✅ / ⚙️" means the default is yes but it's configurable. A bare "⚙️" means it's configurable and there is no default.

|                     | supports urlsafe | `=`s in output | whitespace in output | can omit `=`s in input | can have non-zero padding bits | can have arbitrary characters in input | can have whitespace in input |
| ------------------- | ---------------- | -------------- | -------------------- | ---------------------- | ------------------------------ | -------------------------------------- | ---------------------------- |
| C++ (Boost)         | ❌               | ❌             | ❌                   | ?[^cpp]                | ?                              | ❌                                     | ❌                           |
| Ruby                | ✅               | ✅ / ⚙️[^ruby] | ✅ / ⚙️[^ruby2]      | ✅ / ⚙️                | ✅ / ⚙️                        | ❌                                     | ✅ / ⚙️                      |
| Python              | ✅               | ✅             | ❌                   | ❌                     | ✅                             | ✅ / ⚙️                                | ✅ / ⚙️                      |
| Rust (base64 crate) | ✅               | ⚙️             | ❌                   | ⚙️                     | ⚙️                             | ❌                                     | ❌                           |
| Java                | ✅               | ✅ / ⚙️        | ❌ / ⚙️[^java]       | ✅                     | ✅                             | ❌                                     | ❌ / ⚙️                      |
| Go                  | ✅               | ✅             | ❌                   | ✅ / ⚙️                | ✅ / ⚙️                        | ❌                                     | ✅[^go]                      |
| C#                  | ❌               | ✅             | ❌                   | ❌                     | ✅                             | ❌                                     | ✅                           |
| PHP                 | ❌               | ✅             | ❌                   | ✅                     | ✅                             | ✅ / ⚙️                                | ✅ / ⚙️                      |
| Swift               | ❌               | ✅             | ❌ / ⚙️              | ❌                     | ✅                             | ❌ / ⚙️                                | ❌ / ⚙️                      |

[^cpp]: Boost adds extra null bytes to the output when padding is present, and treats non-zero padding bits as meaningful (i.e. it produces more output when they are present)
[^ruby]: Ruby only allows configuring padding with the urlsafe alphabet
[^ruby2]: Ruby adds linebreaks every 60 characters
[^java]: Java allows MIME-format output, with `\r\n` sequences after every 76 characters of output
[^go]: Go only allows linebreaks specifically

## JS libraries

Only including libraries with a least a million downloads per week and at least 100 distinct dependents.

|                             | supports urlsafe  | `=`s in output | whitespace in output | can omit `=`s in input | can have non-zero padding bits | can have arbitrary characters in input | can have whitespace in input |
| --------------------------- | ----------------- | -------------- | -------------------- | ---------------------- | ------------------------------ | -------------------------------------- | ---------------------------- |
| `atob`/`btoa`               | ❌                | ✅             | ❌                   | ✅                     | ✅                             | ❌                                     | ✅                           |
| Node's Buffer               | ✅[^node]         | ✅             | ❌                   | ✅                     | ✅                             | ✅                                     | ✅                           |
| base64-js (38m/wk)          | ✅ (for decoding) | ✅             | ❌                   | ❌                     | ✅                             | ❌[^base64-js]                         | ❌                           |
| @smithy/util-base64 (8m/wk) | ❌                | ✅             | ❌                   | ❌                     | ✅                             | ❌                                     | ❌                           |
| crypto-js (6m/wk)           | ✅                | ✅             | ❌                   | ✅                     | ✅                             | ❌[^crypto-js]                         | ❌                           |
| js-base64 (5m/wk)           | ✅                | ✅ / ⚙️        | ❌                   | ✅                     | ✅                             | ✅                                     | ✅                           |
| base64-arraybuffer (4m/wk)  | ❌                | ✅             | ❌                   | ✅                     | ✅                             | ❌[^base64-arraybuffer]                | ❌                           |
| base64url (2m/wk)           | ✅                | ❌ / ⚙️        | ❌                   | ✅                     | ✅                             | ✅                                     | ✅                           |
| base-64 (2m/wk)             | ❌                | ✅             | ❌                   | ✅                     | ✅                             | ✅                                     | ✅                           |

[^node]: Node allows mixing alphabets within the same string in input
[^base64-js]: Illegal characters are interpreted as `A`
[^crypto-js]: Illegal characters are interpreted as `A`
[^base64-arraybuffer]: Illegal characters are interpreted as `A`

## "Whitespace"

In all of the above, "whitespace" means only _ASCII_ whitespace. I don't think anyone has special handling for Unicode but non-ASCII whitespace.
