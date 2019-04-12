const { parse } = require('@babel/parser')

class JavaScriptModule {
  static fromSource (source, baseURI) {
    const ast = parse(source, {
      sourceType: 'module',
      plugins: [] // should include most syntax plugins
    })
  }
}

module.exports = JavaScriptModule
