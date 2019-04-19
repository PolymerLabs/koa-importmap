/**
 * TODO(usergenic): The following set of helper functions are more-or-less
 * copied from the npm package dom5 which could not be brought in at this
 * time because it is bound to `parse5@4` where this package uses `parse5@5`.
 * Once dom5 is updated, we can just use that package and not maintain these
 * here.
 */
const traverse = require('parse5-traverse')

module.exports = {
  getAttr,
  getTextContent,
  insertBefore,
  insertNode,
  isDocumentFragment,
  removeFakeRootElements,
  removeNode,
  removeNodeSaveChildren,
  setAttr
}

function filter(
  iter, predicate, matches = []) {
  for (const value of iter) {
    if (predicate(value)) {
      matches.push(value)
    }
  }
  return matches
}

function getAttr (ast, name) {
  const attr = ast.attrs.find(({ name: attrName }) => attrName === name)
  if (attr) {
    return attr.value
  }
}

function getTextContent(node) {
  if (isCommentNode(node)) {
    return node.data || ''
  }
  if (isTextNode(node)) {
    return node.value || ''
  }
  const subtree = nodeWalkAll(node, isTextNode)
  return subtree.map(getTextContent).join('')
}

function setAttr (ast, name, value) {
  let attr = ast.attrs.find(({ name: attrName }) => attrName === name)
  if (attr) {
    attr.value = value
  } else {
    ast.attrs.push({name, value})
  }
}

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

function isCommentNode(node) {
  return node.nodeName === '#comment'  
}

function isDocumentFragment (node) {
  return node.nodeName === '#document-fragment'
}

function isTextNode(node) {
  return node.nodeName === '#text'
}

const defaultChildNodes = (node) => node.childNodes

function* depthFirst(node, getChildNodes = defaultChildNodes) {
  yield node
  const childNodes = getChildNodes(node)
  if (childNodes === undefined) {
    return;
  }
  for (const child of childNodes) {
    yield* depthFirst(child, getChildNodes)
  }
}

function nodeWalkAll(
    node,
    predicate,
    matches,
    getChildNodes = defaultChildNodes) {
    return filter(depthFirst(node, getChildNodes), predicate, matches)
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
