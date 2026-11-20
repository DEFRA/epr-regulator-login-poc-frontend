import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'

const certDir = 'node_modules/.cache/local-https'
const key = `${certDir}/key.pem`
const cert = `${certDir}/cert.pem`
const publicPort = 3000
const appPort = 3001

if (!existsSync(key) || !existsSync(cert)) {
  mkdirSync(certDir, { recursive: true })
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30',
    '-keyout', key, '-out', cert, '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'
  ], { stdio: 'ignore' })
}

https
  .createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
    const upstream = http.request(
      {
        host: '127.0.0.1',
        port: appPort,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, 'x-forwarded-proto': 'https' }
      },
      (response) => {
        res.writeHead(response.statusCode, response.headers)
        response.pipe(res)
      }
    )
    upstream.on('error', (error) => {
      res.writeHead(502)
      res.end(String(error))
    })
    req.pipe(upstream)
  })
  .listen(publicPort, () => {
    console.log(`https://localhost:${publicPort} -> http://127.0.0.1:${appPort}`)
  })

const app = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(appPort),
    APP_BASE_URL: `https://localhost:${publicPort}`
  }
})

app.on('exit', (code) => process.exit(code ?? 0))
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => app.kill(signal))
}
