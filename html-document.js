const { parse, serialize } = require('parse5')
const traverse = require('parse5-traverse')
const url = require('url')
const JavaScriptModule = require('./javascript-module')
const { getAttr, getTextContent, removeFakeRootElements, removeNode, setAttr } = require('./html-document-utils')

class HTMLDocument {
  static fromSource (html, location) {
    const ast = parse(html, { sourceCodeLocationInfo: true })
    removeFakeRootElements(ast)

    const document = new HTMLDocument(ast, location)
    return document
  }
  constructor (ast, location) {
    this.ast = ast
    this.location = location
  }
  get baseHref () {
    for (const base of this.tags('base')) {
      const href = getAttr(base, 'href')
      if (typeof href !== 'undefined') {
        return href
      }
    }
    return ''
  }
  get baseURI () {
    return url.resolve(this.location, this.baseHref)
  }
  get externalImportMaps() {
    return this.importMaps.filter((node) => !!getAttr(node, 'src'))
  }
  get html () {
    return serialize(this.ast)
  }
  get importMaps () {
    return this.query((node) => node.nodeName === 'script' &&
        getAttr(node, 'type') === 'importmap')
  }
  get inlineImportMaps() {
    return this.importMaps.filter((node) => !getAttr(node, 'src'))
  }
  get inlineModules() {
    return this.query((node) => node.nodeName === 'script' &&
      getAttr(node, 'type') === 'module' &&
      !getAttr(node, 'src')).map((script) => {
        const javascript = getTextContent(script)
        const javaScriptModule = JavaScriptModule.fromSource(javascript, this.baseURI)
        return { script, javaScriptModule }
      })
  }
  get moduleScripts() {
    return this.query((node) => node.nodeName === 'script' &&
        getAttr(node, 'type') === 'module')
  }
  query (filter) {
    const nodes = []
    traverse(this.ast, {
      pre: (node) => (filter(node) && nodes.push(node)) || true
    })
    return nodes
  }
  removeImportMapScripts() {
    this.importMaps.forEach(removeNode)
  }
  rewriteModuleScriptSrcs(callback) {
    this.moduleScripts.forEach((script) => {
      const src = getAttr(script, 'src')
      if (src) {
        setAttr(script, 'src', callback(src))
      }
    })
  }
  tags (name) {
    return this.query((node) => node.nodeName === name)
  }
  toString() {
    return this.html
  }
}

module.exports = HTMLDocument

