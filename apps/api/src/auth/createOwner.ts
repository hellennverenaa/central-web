import 'reflect-metadata'
import readline from 'node:readline/promises'
import { stdin, stdout, stderr } from 'node:process'
import { z } from 'zod'
import { parseEnv } from '../config/env.js'
import { createDataSource } from '../db/dataSource.js'
import { validPassword } from './password.js'
import { AuthService } from './service.js'

const emailSchema = z.email().max(254)

function readHidden(label: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Use um terminal interativo para cadastrar o titular.'))
  }
  stdout.write(label)
  return new Promise((resolve, reject) => {
    let password = ''
    const clean = () => {
      stdin.off('data', onData)
      stdin.setRawMode(false)
      stdin.pause()
      stdout.write('\n')
    }
    const onData = (data: Buffer) => {
      for (const char of data.toString('utf8')) {
        if (char === '\u0003') { clean(); reject(new Error('Operação cancelada.')); return }
        if (char === '\r' || char === '\n') { clean(); resolve(password); return }
        if (char === '\u007f' || char === '\b') { password = password.slice(0, -1); continue }
        if (char >= ' ' && password.length < 128) password += char
      }
    }
    stdin.setRawMode(true)
    stdin.resume()
    stdin.on('data', onData)
  })
}

async function main() {
  const env = parseEnv(process.env)
  if (env.NODE_ENV === 'production') throw new Error('Cadastro de titular só está disponível localmente.')
  if (!stdin.isTTY) throw new Error('Use um terminal interativo. Não informe a senha como argumento.')
  const rl = readline.createInterface({ input: stdin, output: stdout })
  const email = (await rl.question('E-mail do titular da Central: ')).trim().toLowerCase()
  rl.close()
  if (!emailSchema.safeParse(email).success) throw new Error('Informe um e-mail válido.')
  const first = await readHidden('Senha (mínimo 12 caracteres; não aparece na tela): ')
  if (!validPassword(first)) throw new Error('Use no mínimo 12 caracteres e no máximo 128.')
  const second = await readHidden('Confirme a senha: ')
  if (first !== second) throw new Error('As senhas são diferentes; nada foi cadastrado.')
  const ds = createDataSource(env)
  try {
    await ds.initialize()
    if (await ds.showMigrations()) throw new Error('Execute npm run db:migrate antes de criar seu titular.')
    await new AuthService(ds).createFirstOwner(email, first)
    stdout.write('Titular cadastrado. Agora você pode testar o login local da API.\n')
  } finally {
    if (ds.isInitialized) await ds.destroy()
  }
}

void main().catch(error => {
  stderr.write((error instanceof Error ? error.message : 'Não foi possível cadastrar.') + '\n')
  process.exitCode = 1
})
