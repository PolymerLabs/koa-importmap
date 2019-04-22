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
  t.plan(1)

  const server = makeServer()
  const response = await request(server).get('/index-a.html')
  server.close()
  t.deepEquals(simplifyHTML(response.text),
    simplifyHTML(
      fs.readFileSync(__dirname + '/fixtures/index-a-expected.html', 'utf8')))
})

test('Middleware rewrites specifiers from external importmap', async (t) => {
  t.plan(1)

  const server = makeServer()
  const response = await request(server).get('/index-b.html')
  server.close()
  t.deepEquals(simplifyHTML(response.text),
    simplifyHTML(
      fs.readFileSync(__dirname + '/fixtures/index-b-expected.html', 'utf8')))
})
