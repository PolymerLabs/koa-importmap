const request = require('supertest')
const rewriter = require('../rewriter-middleware')
const Koa = require('koa')
const static = require('koa-static')
const test = require('tape')

test('Middleware works', async (t) => {
  t.plan(1)

  const app = new Koa()
  app.use(rewriter('https://example.com/'))
  app.use(static(__dirname + '/fixtures'))
  const PORT = process.env.PORT || 8081
  const server = app.listen(PORT).on('error', (e) => console.log(e))

  const response = await request(server).get('/index-a.html')
  server.close()
  
  t.equals('potato', 'potato')
})

