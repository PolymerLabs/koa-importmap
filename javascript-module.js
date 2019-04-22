const { parse } = require('@babel/parser')
const generate = require('@babel/generator').default
const traverse = require('@babel/traverse').default
class JavaScriptModule {
  static fromSource (source, baseURI) {
    const ast = parse(source, {
      sourceType: 'module',
      plugins: [] // should include most syntax plugins
    })
    const jsModule = new JavaScriptModule(ast, baseURI)
    return jsModule 
  }
  constructor(ast, baseURI) {
    this.ast = ast
    this.baseURI = baseURI
  }
  rewriteSpecifiers(callback) {
    const importExportDeclaration = {
      enter(path) {
        if (path.node &&
          path.node.source &&
          path.node.source.type === 'StringLiteral') {
          const specifier = path.node.source.value
          const rewrittenSpecifier = callback(specifier)
          if (rewrittenSpecifier) {
            path.node.source.value = rewrittenSpecifier
          }
        }
      }
    }
    traverse(this.ast, {
      ImportDeclaration: importExportDeclaration,
      ExportAllDeclaration: importExportDeclaration,
      ExportNamedDeclaration: importExportDeclaration,
      CallExpression: {
        enter(path) {
          if (path.node &&
            path.node.callee &&
            path.node.callee.type === 'Import' &&
            path.node.arguments.length === 1 &&
            path.node.arguments[0].type === 'StringLiteral') {
            const specifier = path.node.arguments[0].value
            const rewrittenSpecifier = callback(specifier)
            path.node.arguments[0].value = rewrittenSpecifier
          }
        }
      }
    })
  }
  toString() {
    return generate(this.ast).code
  }
}

module.exports = JavaScriptModule
