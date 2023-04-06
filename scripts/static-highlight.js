'use strict';

let fs = require('fs');
let path = require('path');

let jsdom = require('jsdom');
let Prism = require('prismjs');

// jsdom is the laziest possible way of doing this
// but whatever it works fine and only takes ~1s
function highlightCodeblocks(html) {
  let dom = new jsdom.JSDOM(html, { includeNodeLocations: true });
  let nodes = dom.window.document.querySelectorAll('code[class="lang-js"],code[class="language-js"],code[class="lang-javascript"],code[class="language-javascript"]');
  if (nodes.length === 0) {
    console.error('warning: no code blocks found');
    return html;
  }
  // last-first
  let sorted = [...nodes].map(n => ({ node: n, loc: dom.nodeLocation(n) })).sort((a, b) => b.loc.startOffset - a.loc.startOffset);
  for (let { node, loc } of sorted) {
    let prefix = html.slice(0, loc.startTag.endOffset);
    let code = html.slice(loc.startTag.endOffset, loc.endTag.startOffset).trimStart(); // for the leading newline
    let suffix = html.slice(loc.endTag.startOffset);

    let formatted = Prism.highlight(code, Prism.languages.javascript, 'javascript');
    html = `${prefix}${formatted}${suffix}`;
  }
  return html;
}

if (process.argv.length < 3) {
  console.log('Usage: node static-highlight.js path-to-input.html > path-to-output.html');
}
let source = fs.readFileSync(process.argv[2], 'utf8');
console.log(highlightCodeblocks(source));
