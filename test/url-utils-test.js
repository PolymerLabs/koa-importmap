const { appendQueryParameter, extractQueryParameter } = require('../url-utils')
const test = require('tape')

test('Append works', (t) => {
  t.plan(1)
  t.equals(appendQueryParameter('https://example.com/', 'x', '1'), 'https://example.com/?x=1')
})
