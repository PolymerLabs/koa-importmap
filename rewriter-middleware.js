const getStream = require('get-stream')
const isStream = require('is-stream')
const stream = require('stream')
const LRU = require('lru-cache')
const { getAttr, getTextContent } = require('./html-document-utils')
const { appendQueryParameter, extractQueryParameter } = require('./url-utils')
const { format: formatURL, parse: parseURL } = require('url')
const HTMLDocument = require('./html-document')
const ImportMap = require('./importmap')
const JavaScriptModule = require('./javascript-module')
module.exports = createMiddleware

function createMiddleware(root, opts = {}) {
  const cache = new LRU()
  const queryParameter = opts.queryParameter || 'koa-importmap'
  const baseURL = opts.baseURL || 'https://127.0.0.1'
  const parsedBaseURL = parseURL(baseURL)

  // TODO(usergenic): Figure out how to deal with importmaps and fully-qualified URLs;
  // For the purpose of host matching in more complex importmaps, we can offer a
  // hosts map option.  Would allow 127.0.0.1 to remap to 'example.com' or something?
  // Also, not quite sure how we're dealing with SSL/non-SSL yet...
  // const hosts = opts.hosts || {}

  return async (ctx, next) => {
    const {pathname, search} = parseURL(ctx.request.url)
    const host = ctx.request.header && ctx.request.header.host || parsedBaseURL.host

    // Import maps care about URLs so we need to establish a host for the request
    const parsedRequestURL = Object.assign({}, parsedBaseURL, { host, pathname, search })

    // Extract the importmap query parameter if present
    const { url: rewrittenRequestURL, value: queryParameterValue } =
      extractQueryParameter(formatURL(parsedRequestURL), queryParameter)

    // Change the URL to remove the importmap query parameter
    ctx.request.url = parseURL(rewrittenRequestURL).path

    // Continue with the request ala next()
    await next()
   
    // If the request has an importmap query parameter, we assume its a JS module:
    if (queryParameterValue) {
      console.log('i hav dat query parameter')

      // Get the importmap(s) from the cache
      const importMaps = queryParameterValue.split(',').map((id) => cache.get(id))
      
      let body = ctx.body
      if (!body || body.pipe) return
      if (Buffer.isBuffer(body)) body = body.toString()
      
      // Resolve and rewrite all mapped specifiers in the returned module using importmap
      const jsModule = JavaScriptModule.fromSource(body, rewrittenRequestURL)
      
      importMaps.forEach((importmap) => jsModule.rewriteSpecifiers(importmap))
      
      ctx.body = jsModule.toString()
    }
    
    // If the request returns an HTML document:
    else if (ctx.response.is('html')) {
      let body = ctx.body
      if (!body) return
      if (Buffer.isBuffer(body)) body = body.toString()
      if (isStream(body)) body = await getStream(body)

      const htmlDocument = HTMLDocument.fromSource(body, rewrittenRequestURL)
      
      const digests = []

      // For each importmap:
      // Append importmap digest to the importmaps Array for this request
      htmlDocument.importmaps.forEach((script) => {
        const src = getAttr(script, 'src')
        
        // External importmap? Fetch, parse and store
        if (src) {
          // NOT YET IMPLEMENTED OH MY GORSH!       
        }

        // Inline importmap? Parse and store
        else {
          const json = getTextContent(script)
          const importmap = ImportMap.fromSource(json, rewrittenRequestURL)
          cache.has(importmap.digest) || cache.set(importmap.digest, importmap)
          digests.push(importmap.digest)
        }
      })

      // For each JavaScript module:
      // Inline module? Resolve and rewrite all mapped specifiers using importmap(s)
      
      // External module? Rewrite URL to include importmap query parameter
      htmlDocument.rewriteModuleScriptSrcs((src) => 
        appendQueryParameter(src, queryParameter, digests.join(',')))
      
      ctx.body = htmlDocument.toString()
    }
  }
}
