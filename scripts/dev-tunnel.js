/**
 * Túnel HTTPS → localhost (câmera no iPhone/Android em HTTP da LAN não funciona).
 *
 * Pré-requisito: `npm run dev` na porta do .env.local (ex.: 5552).
 * Requer cloudflared no PATH: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
 */
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
let port = 3000
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const portMatch = envContent.match(/^PORT=(\d+)/m)
  if (portMatch) port = parseInt(portMatch[1], 10)
}

const args = process.argv.slice(2)
const portArgIndex = args.findIndex(arg => arg === '-p' || arg === '--port')
if (portArgIndex !== -1 && args[portArgIndex + 1]) {
  port = parseInt(args[portArgIndex + 1], 10)
}

const target = `http://127.0.0.1:${port}`
console.log(`🔐 Túnel HTTPS → ${target}`)
console.log('   Deixe o npm run dev rodando. No celular abra a URL https://….trycloudflare.com que aparecer.')
console.log(`   App entregador: …/expedicao/app?expedicao&app`)
console.log('')

const child = spawn(
  'cloudflared',
  ['tunnel', '--url', target],
  { stdio: 'inherit', shell: true, env: { ...process.env } }
)

child.on('error', error => {
  console.error('❌ cloudflared não encontrado:', error.message)
  console.error('   Instale: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/')
  process.exit(1)
})

child.on('exit', code => process.exit(code || 0))
