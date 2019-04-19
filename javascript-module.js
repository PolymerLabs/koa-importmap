const { parse } = require('@babel/parser')
const { generate } = require('@babel/generator')
const { traverse } = require('@babel/traverse')

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
  rewriteSpecifiers(importmap) {
    this.specifiers.forEach((specifier) => {
      // Handle each type of specifier in AST
      // Use the importmap to rewrite AST
    })
  }
  get specifiers() {
    return []
  }
  get toString() {
    return generate(this.ast)
  }
}

module.exports = JavaScriptModule
