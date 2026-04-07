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
}

// Verifica se há porta passada como argumento (tem prioridade)
const args = process.argv.slice(2)
const portArgIndex = args.findIndex(arg => arg === '-p' || arg === '--port')
if (portArgIndex !== -1 && args[portArgIndex + 1]) {
  port = parseInt(args[portArgIndex + 1], 10)
}

console.log(`🚀 Iniciando servidor Next.js na porta ${port}...`)

// Executa o Next.js com a porta
const nextProcess = spawn('npx', ['next', 'start', '-p', port.toString()], {
  stdio: 'inherit',
  shell: true,
})

nextProcess.on('error', (error) => {
  console.error('❌ Erro ao iniciar o servidor:', error)
  process.exit(1)
})

nextProcess.on('exit', (code) => {
  process.exit(code || 0)
})
