const request = require('supertest')
const rewriter = require('../rewriter-middleware')
const Koa = require('koa')
const static = require('koa-static')
const test = require('tape')
const fs = require('fs')
const { simplifyHTML } = require('./test-utils')

function makeServer() {
  const app = new Koa()
  const PORT = process.env.PORT || 8081
  app.use(rewriter(`http://127.0.0.1:${PORT}/`))
  app.use(static(__dirname + '/fixtures'))
  return app.listen(PORT).on('error', (e) => `ERROR: ${console.log(e)}`)
}

test('Middleware rewrites specifiers from inline importmap', async (t) => {
  t.plan(2)

  const server = makeServer()
  const indexResponse = await request(server).get('/index-a.html')
  const moduleXResponse = await request(server).get('/module-x/module-x.js?koa-importmap=e82874a8dbe77ec6e4746a35f9d3065e2f2628913c30e1e785b73375baa98465')
  server.close()
  t.deepEquals(simplifyHTML(indexResponse.text),
    simplifyHTML(
      fs.readFileSync(__dirname + '/fixtures/index-a-expected.html', 'utf8')),
    'specifiers in inline modules rewritten')
  t.deepEquals(simplifyHTML(moduleXResponse.text),
    simplifyHTML(
      fs.readFileSync(__dirname + '/fixtures/module-x/module-x-expected.js', 'utf8')),
    'specifiers in external modules rewritten')
})

test('Middleware rewrites specifiers from external importmap', async (t) => {
  t.plan(1)

  const server = makeServer()
  const indexResponse = await request(server).get('/index-b.html')
  server.close()
  t.deepEquals(simplifyHTML(indexResponse.text),
    simplifyHTML(
      fs.readFileSync(__dirname + '/fixtures/index-b-expected.html', 'utf8')))
})
