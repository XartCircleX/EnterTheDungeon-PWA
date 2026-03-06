import { createSsrHtmlResponse } from '../server/renderSsrPage.js'

export default async function handler(_req, res) {
  const html = await createSsrHtmlResponse()
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(html)
}
