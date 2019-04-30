const { Parser } = require('shady-css-parser')

class CSSDocument {
  static fromSource(css, location) {
    const ast = (new Parser()).parse(css)
    const document = new CSSDocument(ast, location)
    return document
  }
  constructor(ast, location) {
    this.ast = ast
    this.location = location
  }
  toString() {
    return (new Stringifier()).stringify(this.ast)
  }
}

module.exports = CSSDocument
