const getStream = require('get-stream')
const isStream = require('is-stream')
const fetch = require('node-fetch')
const LRU = require('lru-cache')
const { getAttr, getTextContent, setTextContent } = require('./html-document-utils')
const { appendQueryParameter, extractQueryParameter } = require('./url-utils')
const { format: formatURL, parse: parseURL, resolve: resolveURL } = require('url')
const CSSDocument = require('./css-document')
const HTMLDocument = require('./html-document')
const ImportMap = require('./importmap')
const JavaScriptModule = require('./javascript-module')

module.exports = createMiddleware

function createMiddleware(root, opts = {}) {
  const cache = new LRU()
  const queryParameter = opts.queryParameter || 'koa-importmap'
  const baseURL = opts.baseURL || 'http://127.0.0.1'
  const parsedBaseURL = parseURL(baseURL)

  // TODO(usergenic): Figure out how to deal with import maps and fully-qualified URLs;
  // For the purpose of host matching in more complex import maps, we can offer a
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
   
    // If there's no query parameter value and we're not processing HTML, we are
    // onconcerned with the response.
    if (!queryParameterValue && !ctx.response.is('html')) {
      return
    }

    const body = await getBodyAsString(ctx.body)
    
    // If there's no response body at all, we can't process anything.
    if (!body) {
      return
    }
   
    // If the request has an import map query parameter, we assume its a JS module:
    if (queryParameterValue && ctx.response.is('js')) {
      const javaScriptModule = JavaScriptModule.fromSource(body, rewrittenRequestURL)
      await rewriteJavaScriptModule({
          cache, javaScriptModule, queryParameter, queryParameterValue, rewrittenRequestURL
      })
      ctx.body = javaScriptModule.toString()
      return
    }

    if (queryParameterValue && ctx.response.is('css')) {
      const cssDocument = cssDocument.fromSource(body, rewrittenRequestURL)
      await rewriteCSSDocument({
          cache, cssDocument, ctx, queryParameter, queryParameterValue
      })
      ctx.body = cssDocument.toString()
      return
    }

    // If the request returns an HTML document:
    if (ctx.response.is('html')) {
      const htmlDocument = HTMLDocument.fromSource(body, rewrittenRequestURL)
      await rewriteHTMLDocument({
          cache, ctx, htmlDocument, queryParameter, rewrittenRequestURL
      })
      ctx.body = htmlDocument.toString()
      return
    }
  }
}

async function rewriteCSSDocument({ cache, cssDocument, ctx, queryParameter, queryParameterValue }) {
  // TODO(usergenic): Not yet implemented
}

async function rewriteHTMLDocument({cache, ctx, htmlDocument, queryParameter, rewrittenRequestURL}) {
  const importMaps = []

  // For every External ImportMap, get it from cache or HTTP request, parse
  // and store it
  await Promise.all(htmlDocument.externalImportMaps.map(async (script) => {
    const src = getAttr(script, 'src')
    const rewrittenSrc = resolveURL(htmlDocument.baseURI, src)
    const fetchOptions = {
      headers: ctx.request.headers
    }
    const externalMapResponse = await fetch(rewrittenSrc, fetchOptions)
    const externalMapJSON = await getBodyAsString(externalMapResponse.body)
    const importMap = ImportMap.fromSource(externalMapJSON, rewrittenSrc)
    cache.has(importMap.digest) || cache.set(importMap.digest, importMap)
    importMaps.push(importMap)
  }))
    
  // For every Inline ImportMap, get it from cache or parse and store it
  await Promise.all(htmlDocument.inlineImportMaps.map(async (script) => {
    const json = getTextContent(script)
    const importMap = ImportMap.fromSource(json, rewrittenRequestURL)
    cache.has(importMap.digest) || cache.set(importMap.digest, importMap)
    importMaps.push(importMap)
  }))

  // For each JavaScript module:
  // Inline module? Resolve and rewrite all mapped specifiers using importmap(s)
  htmlDocument.inlineModules.forEach((inlineModule) => {
    inlineModule.javaScriptModule.rewriteSpecifiers((specifier) => {
      importMaps.forEach((importMap) => {
        specifier = importMap.resolve(specifier, rewrittenRequestURL) || specifier
      })
      return appendQueryParameter(specifier, queryParameter, importMaps.map((m) => m.digest).join(','))
    })
    setTextContent(inlineModule.script, inlineModule.javaScriptModule.toString())
  })
  // External module? Rewrite URL to include importmap query parameter
  htmlDocument.rewriteModuleScriptSrcs((src) => 
    appendQueryParameter(src, queryParameter, importMaps.map((m) => m.digest).join(',')))
  
  // Remove the import map script tags from the HTML, since we've modified
  // related specifiers in the middleware.
  htmlDocument.removeImportMapScripts()

}

async function rewriteJavaScriptModule({cache, javaScriptModule, queryParameter, queryParameterValue, rewrittenRequestURL}) {
  // Get the import map(s) from the cache
  const importMaps = queryParameterValue.split(',').map((id) => cache.get(id))
  
  // Resolve and rewrite all mapped specifiers in the returned module using the
  // import maps.
  javaScriptModule.rewriteSpecifiers((specifier) => {
    importMaps.forEach((importMap) => {
      specifier = importMap.resolve(specifier, rewrittenRequestURL) || specifier
    })
    return appendQueryParameter(specifier, queryParameter, queryParameterValue)
  })
}

async function getBodyAsString(body) {
  if (!body) {
    return
  }
  if (Buffer.isBuffer(body)) {
    return body.toString()
  }
  if (isStream(body)) {
    return await getStream(body)
  }
}
