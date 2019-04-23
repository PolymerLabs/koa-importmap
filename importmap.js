const { parseFromString } = require('./wicg-reference-implementation/parser')
const { resolve } = require('./wicg-reference-implementation/resolver')
const { parse: parseURL, format: formatURL } = require('url')
const crypto = require('crypto')

class ImportMap {
  static fromSource(json, location) {
    const parsed = parseFromString(json, location)
    const digest = crypto.createHash('sha256').update(json.trim(), 'utf8').digest('hex')
    return new ImportMap(parsed, location, digest)
  }
  constructor(parsedMap, location, digest) {
    this.parsedMap = parsedMap
    this.location = location
    this.digest = digest
  }
  resolve(specifier, baseURL) {
    const scriptURL = parseURL(baseURL)
    try {
      const resolvedURL = resolve(specifier, this.parsedMap, scriptURL)
      return formatURL(resolvedURL)
    } catch (e) {
      return undefined
    }
  }
}

module.exports = ImportMap
