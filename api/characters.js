export default async function handler(req, res) {
  const TARGET = 'https://basic-api-wiki-hvdo.vercel.app/api/characters'

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const options = {
    method: req.method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  }

  if (req.method === 'PATCH') {
    options.body = JSON.stringify(req.body)
  }

  const upstream = await fetch(TARGET, options)
  const data = await upstream.json()

  res.status(upstream.status).json(data)
}
