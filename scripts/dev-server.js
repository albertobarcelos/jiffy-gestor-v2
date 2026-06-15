const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// Lê o arquivo .env.local
const envPath = path.join(__dirname, '..', '.env.local')
let port = 3000 // Porta padrão

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const portMatch = envContent.match(/^PORT=(\d+)/m)
  if (portMatch) {
    port = parseInt(portMatch[1], 10)
  }

  const tlsSkipMatch = envContent.match(/^API_TLS_SKIP_VERIFY=(.+)$/m)
  if (tlsSkipMatch && tlsSkipMatch[1].trim().toLowerCase() === 'true') {
    process.env.API_TLS_SKIP_VERIFY = 'true'
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    console.warn(
      '⚠️  API_TLS_SKIP_VERIFY=true: verificação TLS desabilitada (somente desenvolvimento local).'
    )
  }
}

// Verifica se há porta passada como argumento (tem prioridade)
const args = process.argv.slice(2)
const portArgIndex = args.findIndex(arg => arg === '-p' || arg === '--port')
if (portArgIndex !== -1 && args[portArgIndex + 1]) {
  port = parseInt(args[portArgIndex + 1], 10)
}

console.log(`🚀 Iniciando servidor Next.js na porta ${port}...`)

// Executa o Next.js com a porta
const nextProcess = spawn('npx', ['next', 'dev', '-p', port.toString()], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
})

nextProcess.on('error', (error) => {
  console.error('❌ Erro ao iniciar o servidor:', error)
  process.exit(1)
})

nextProcess.on('exit', (code) => {
  process.exit(code || 0)
})
