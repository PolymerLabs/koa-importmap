const { parse, serialize } = require('parse5')
const traverse = require('parse5-traverse')
const url = require('url')

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
    this.query((node) => {
    })
  }
  get baseURI () {
    return url.resolve(this.location, this.baseHref)
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
  get html () {
    return serialize(this.ast)
  }
  get importmaps () {
    return this.query((node) => node.nodeName === 'script' &&
      getAttr(node, 'type') === 'importmap')
  }
  query (filter) {
    const nodes = []
    traverse(this.ast, {
      pre: (node) => (filter(node) && nodes.push(node)) || true
    })
    return nodes
  }
  tags (name) {
    return this.query((node) => node.nodeName === name)
  }
}

module.exports = HTMLDocument

function getAttr (ast, name) {
  const attr = ast.attrs.find(({ name: attrName }) => attrName === name)
  if (attr) {
    return attr.value
  }
}

/*
function setAttr (ast, name, value) {
  let attr = ast.attrs.find(({ name: attrName }) => console.log(attrName) || attrName === name)
  if (attr) {
    attr.value = value
  }
  if (!attr) {
    ast.attrs.push({name, value})
  }
}
*/

function insertBefore (parent, oldNode, newNode) {
  const index = parent.childNodes.indexOf(oldNode)
  insertNode(parent, index, newNode)
}

function insertNode (
  parent, index, newNode, replace) {
  if (!parent.childNodes) {
    parent.childNodes = []
  }
  let newNodes = []
  let removedNode = replace ? parent.childNodes[index] : null
  if (newNode) {
    if (isDocumentFragment(newNode)) {
      if (newNode.childNodes) {
        newNodes = Array.from(newNode.childNodes)
        newNode.childNodes.length = 0
      }
    } else {
      newNodes = [newNode]
      removeNode(newNode)
    }
  }
  if (replace) {
    removedNode = parent.childNodes[index]
  }
  Array.prototype.splice.apply(
    parent.childNodes, ([index, replace ? 1 : 0]).concat(newNodes))
  newNodes.forEach((n) => {
    n.parentNode = parent
  })

  if (removedNode) {
    removedNode.parentNode = undefined
  }
}

function isDocumentFragment (node) {
  return node.nodeName === '#document-fragment'
}

function removeFakeRootElements (node) {
  const fakeRootElements = []
  traverse(node, {
    pre: (node) => {
      if (node.nodeName && node.nodeName.match(/^(html|head|body)$/i) && !node.sourceCodeLocation) {
        fakeRootElements.unshift(node)
      }
    }
  })
  fakeRootElements.forEach(removeNodeSaveChildren)
}

function removeNode (node) {
  const parent = node.parentNode
  if (parent && parent.childNodes) {
    const idx = parent.childNodes.indexOf(node)
    parent.childNodes.splice(idx, 1)
  }
  node.parentNode = undefined
}

function removeNodeSaveChildren (node) {
  // We can't save the children if there's no parent node to provide
  // for them.
  const fosterParent = node.parentNode
  if (!fosterParent) {
    return
  }
  const children = (node.childNodes || []).slice()
  for (const child of children) {
    insertBefore(node.parentNode, node, child)
  }
  removeNode(node)
}
