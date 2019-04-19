const { format, parse } = require('url')

module.exports = { appendQueryParameter, extractQueryParameter }

function appendQueryParameter(url, param, value) {
  const parsed = parse(url)
  const params = parsed.query ? parsed.query.split('&') : []
  params.push(`${encodeURIComponent(param)}=${encodeURIComponent(value)}`)
  parsed.search = `?${params.join('&')}`
  return format(parsed)
}

function extractQueryParameter(url, param) {
  const parsed = parse(url)
  const params = parsed.query ? parsed.query.split('&') : []
  let value = undefined
  const index = params.findIndex((pair) => {
    const split = pair.split('=')
    if (split[0] === param) {
      value = split[1]
      return true
    }
  })
  if (index !== -1) {
    params.splice(index, 1)
    url.search = params.length === 0 ? undefined : `?${params.join('&')}`
  }
  return { url: format(url), value }
}
