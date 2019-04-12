const HTMLDocument = require('../html-document')
const test = require('tape')

test('baseURI when no base href value', (t) => {
  t.plan(1)
  const doc = HTMLDocument.fromSource(`
    <base>
  `, '/some/resource')
  t.equal(doc.baseURI, '/some/resource', 'equals the document location')
})

test('baseURI sibling resource', (t) => {
  t.plan(1)
  const doc = HTMLDocument.fromSource(`
    <base href="sibling/resource">
  `, '/some/resource')
  t.equal(doc.baseURI, '/some/sibling/resource', 'resolves to sibling resource')
})

test('baseURI root', (t) => {
  t.plan(1)
  const doc = HTMLDocument.fromSource(`
    <base href="/">
  `, '/some/resource')
  t.equal(doc.baseURI, '/', 'an absolute path redefines baseURI')
})

test('html serializes AST preserving html/head/body', (t) => {
  t.plan(1)
  const doc = HTMLDocument.fromSource(`
    <html><head></head><body><div>hello</div></body></html>
  `, '/some/resource')
  t.equal(doc.html.replace(/\s/g, ''),
    `<html><head></head><body><div>hello</div></body></html>`,
    'preserve the html/head/body tags from parsed source')
})

test('html serializes AST without html/head/body', (t) => {
  t.plan(1)
  const doc = HTMLDocument.fromSource(`
    <div>hello</div>
  `, '/some/resource')
  t.equal(doc.html.replace(/\s/g, ''), '<div>hello</div>',
    'do not include html/head/body if not parsed in source')
})
