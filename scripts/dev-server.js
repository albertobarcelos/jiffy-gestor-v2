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

function ipv4Lan() {
  try {
    const os = require('os')
    const nets = os.networkInterfaces()
    const candidatos = []
    for (const entries of Object.values(nets)) {
      for (const net of entries || []) {
        if (net.family !== 'IPv4' && net.family !== 4) continue
        if (net.internal) continue
        candidatos.push(net.address)
      }
    }
    // Preferir Wi‑Fi/Ethernet doméstico; Hyper-V/WSL costumam ser 172.x
    return (
      candidatos.find(ip => ip.startsWith('192.168.')) ||
      candidatos.find(ip => ip.startsWith('10.')) ||
      candidatos.find(ip => /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) ||
      candidatos[0] ||
      null
    )
  } catch {
    return null
  }
}

const lan = ipv4Lan()
console.log(`🚀 Iniciando servidor Next.js na porta ${port}...`)
console.log(`   PC:     http://localhost:${port}`)
if (lan) {
  console.log(`   Celular (mesma Wi‑Fi): http://${lan}:${port}/expedicao/app?expedicao&app`)
  console.log(`   Se não abrir no celular: Firewall do Windows → permitir porta TCP ${port} (rede privada).`)
}

// Executa o Next.js na porta e em todas as interfaces (LAN)
const nextProcess = spawn('npx', ['next', 'dev', '-H', '0.0.0.0', '-p', port.toString()], {
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
