import React from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { VFile } from 'vfile';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';

function createProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true });
}

function createFile(markdown) {
  const file = new VFile();
  file.value = markdown;
  return file;
}

function post(tree) {
  return toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    passNode: true
  });
}

export default function MarkdownRenderer({ markdown }) {
  const processor = createProcessor();
  const file = createFile(markdown);
  const tree = processor.runSync(processor.parse(file), file);
  return post(tree);
}