// Dependency-free rehype plugins. hast nodes are plain objects, so a small
// recursive walker is all we need.

function visit(node, fn) {
  fn(node);
  if (node.children) {
    for (const child of node.children) visit(child, fn);
  }
}

function textOf(node) {
  let out = '';
  visit(node, (n) => {
    if (n.type === 'text') out += n.value;
  });
  return out;
}

/** Open external links in a new tab. */
export function externalLinks() {
  return (tree) => {
    visit(tree, (node) => {
      if (
        node.type === 'element' &&
        node.tagName === 'a' &&
        typeof node.properties?.href === 'string' &&
        /^https?:\/\//i.test(node.properties.href)
      ) {
        node.properties.target = '_blank';
        node.properties.rel = 'noopener';
      }
    });
  };
}

/**
 * Wrap the "## Fun fact" heading and everything up to the next h2 (or end of
 * document) in <aside class="fun-fact"> so it can be styled as a callout card.
 */
export function funFactSection() {
  return (tree) => {
    const kids = tree.children;
    if (!Array.isArray(kids)) return;
    const isH2 = (n) => n.type === 'element' && n.tagName === 'h2';
    const start = kids.findIndex(
      (n) => isH2(n) && /^fun fact/i.test(textOf(n).trim())
    );
    if (start === -1) return;
    let end = kids.length;
    for (let i = start + 1; i < kids.length; i++) {
      if (isH2(kids[i])) {
        end = i;
        break;
      }
    }
    const wrapper = {
      type: 'element',
      tagName: 'aside',
      properties: { className: ['fun-fact'] },
      children: kids.slice(start, end),
    };
    kids.splice(start, end - start, wrapper);
  };
}
