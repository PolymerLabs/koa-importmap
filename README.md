# koa-importmap

A [Koa](https://koajs.com/) middleware module that can rewrite import specifiers for JavaScript modules based on the reference/presence of an [importmap](https://github.com/WICG/import-maps) in the HTML document originating the request.  

The middleware persists a reference to the importmap to requests for all transitive imports in the graph by use of a query parameter which is appended and consumed by the middleware.

## Usage

Here's a quick Koa server which serves static files and rewrites import specifiers based on import maps.

`./server.js`
```js
const app = new require('koa')
const root = __dirname
app.use(require('koa-importmap')(root))
app.use(require('koa-static')(root))
app.listen(3000)
```

## Example

Consider a project folder with the following contents.
```
importmap.json
index.html
node_modules/mod-a/index.js
node_modules/mod-a/node_modules/mod-b/index.js
node_modules/mod-b/index.js
```

The `importmap.json` file contains both "imports" and "scopes" to demonstrate the behavior of each:
```json
{
  "imports": {
    "mod-a": "/node_modules/mod-a/index.js",
    "mod-b": "/node_modules/mod-b/index.js"
  },
  "scopes": {
    "/node_modules/mod-a/": {
      "mod-b": "/node_modules/mod-a/node_modules/mod-b/index.js"
    }
  }
}
```

The JavaScript modules are simple.  Top-level `mod-a` simply re-exports the default export of its nested `mod-b`.  The nested `mod-b` exports a function that single-quotes its string argument.  Top-level `mod-b` exports a function the double-quotes its string argument:

```js
// node_modules/mod-a/index.js
import b from 'mod-b'
export default b
```

```js
// node_modules/mod-a/node_modules/mod-b/index.js
export default (text) => `'${text}'`
```

```js
// node_modules/mod-b/index.js
export default (text) => `"${text}"`
```

The main HTML file `./index.html` references the import map and contains module script which uses bare name specifiers.
```html
<script type="importmap" src="importmap.json"></script>

<script type="module">
  import a from 'mod-a'
  import b from 'mod-b'
  console.log(a('singlequoted'))
  console.log(b('doublequoted'))
</script>
```

The expected console output when loading `/index.html` in a browser which supports import maps natively would be:
```
'singlequoted'
"doublequoted"
```

When requested and processed through the `koa-importmap` middleware, the import map is fetched/cached or read-from-cache, processed and HTML is rewritten:
```html
<script type="module">
  import a from '/node_modules/mod-a/index.js?koa-importmap=6a83b08a'
  import b from '/node_modules/mod-b/index.js?koa-importmap=6a83b08a'
  console.log(a('singlequoted'))
  console.log(b('doublequoted'))
</script>
```

JavaScript requested with the `koa-importmap=6a83b08a` is then processed using the cached import map referenced and is rewritten as well.  For example, request for `/node_modules/mod-a/index.js?koa-importmap=6a83b08a` returns:
```js
import b from './node_modules/mod-b/index.js?koa-importmap=6a83b08a'
export default b
```

## Gotchas

Initially, this middleware is intended primarily for use in a development context and has shortcomings in production scenarios.  It can be quite expensive in terms of memory and processing to parse every HTML and JavaScript document returned through the middleware.

Additionally, the `koa-importmap` query parameter is a digest of the content of a processed import map.  The digest is used as a key for the default in-memory LRU cache that stores the parsed importmap.  If this middleware was to be used in a production environment running multiple instances of the server, it would need to either use a shared cache or ensure that requests were bound to same server.

