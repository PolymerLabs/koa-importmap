module.exports = { simplifyHTML }

function simplifyHTML(html) {
  return html.replace(/\s+/mg, ' ')
    .replace(/\s</g, '<')
    .replace(/>\s/g, '>')
    .replace(/>\s?</g, '>\n<')
    .trim()
}
