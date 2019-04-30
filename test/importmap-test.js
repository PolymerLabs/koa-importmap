const ImportMap = require('../importmap')
const test = require('tape')

test('parse an importmap successfully', (t) => {
  t.plan(1)

  const importmap = ImportMap.fromSource(`
    {
      "imports": {
        "module-x": "/node_modules/module-x/index.js",
        "module-y": "/node_modules/module-y/module-y.js"
      },
      "scopes": {
        "/node_modules/module-x/": {
          "module-y": "/node_modules/module-x/node_modules/module-y/module-y.js"
        }
      }
    }
  `, 'https://example.com/importmap.json')

  // tape reporter uses object-inspect and has trouble with object as-is, so
  // we'll sanitize it here.
  const data = JSON.parse(JSON.stringify(importmap.parsedMap))

  t.deepEqual({
    imports: {
      'module-x': ['https://example.com/node_modules/module-x/index.js'],
      'module-y': ['https://example.com/node_modules/module-y/module-y.js']
    },
    scopes: {
      'https://example.com/node_modules/module-x/': {
        'module-y': ['https://example.com/node_modules/module-x/node_modules/module-y/module-y.js']
      }
    }
  }, data, 'contains expected imports and scopes data')

  test('can resolve specifier matching import', (t) => {
    t.plan(1)
    t.equals(importmap.resolve('module-x',
        'https://example.com/index.html'),
        'https://example.com/node_modules/module-x/index.js')
  })

  test('can resolve specifier matching scoped import', (t) => {
    t.plan(1)
    t.equals(importmap.resolve('module-y',
        'https://example.com/node_modules/module-x/index.js'),
        'https://example.com/node_modules/module-x/node_modules/module-y/module-y.js')
  })

  test('can resolve a specifier matching nothing', (t) => {
    t.plan(1)
    t.equals(importmap.resolve('module-z', 'https://example.com/index.html'),
        undefined)
  })

  test('can resolve "import:" URL', (t) => {
    t.plan(1)
    t.equals(importmap.resolveImportSchemeURL('import:module-y',
        'https://example.com/'),
        'https://example.com/node_modules/module-y/module-y.js')
  })

  test('can resolve "import:" URL, honoring scopes', (t) => {
    t.plan(1)
    t.equals(importmap.resolveImportSchemeURL('import:module-y',
        'https://example.com/node_modules/module-x/index.js'),
        'https://example.com/node_modules/module-x/node_modules/module-y/module-y.js')
  })
})

test('parse an importmap with errors', (t) => {
  t.plan(1)

  const importmap = ImportMap.fromSource(`
    {
      "fakeimports": {
        "this": "doesn't belong here"
      },
      "imports": {
        "something": "/path/to/something/index.js",
        "otherthing": "invalid link"
      },
      "scopes": {
        "/path/to/otherthing/": {
          "something": "some invalid whatever"
        }
      }
    }
  `, 'https://example.com/subsection/importmap.json')

  // tape reporter uses object-inspect and has trouble with object as-is, so
  // we'll sanitize it here.
  const data = JSON.parse(JSON.stringify(importmap.parsedMap))

  t.deepEqual({
    // note there is no valid key called "fakeimports" so its not here
    imports: {
      otherthing: [], // was invalid so this is empty
      something: ['https://example.com/path/to/something/index.js']
    },
    scopes: {
      'https://example.com/path/to/otherthing/': {
        something: [] // was invalid so this is empty
      }
    }
  }, data, 'contains only valid imports and scopes data')
})
