import 'reflect-metadata'
import { parseEnv } from '../config/env.js'
import { createDataSource } from './dataSource.js'

/** Execução intencional — iniciar o servidor NÃO executa migrations. */
async function main() {
  const command = process.argv[2]
  if (command !== 'up' && command !== 'status' && command !== 'down') {
    throw new Error('Use: npm run db:migrate, npm run db:status ou npm run db:revert:test.')
  }
  const env = parseEnv(process.env)
  if (env.NODE_ENV === 'production') throw new Error('Migrations da etapa 7.2 só estão liberadas no ambiente local.')
  if (command === 'down' && (!env.DB_NAME.endsWith('_test') || process.env.CONFIRM_TEST_RESET !== 'YES')) {
    throw new Error('Reversão destrutiva permitida somente em banco _test com CONFIRM_TEST_RESET=YES.')
  }
  const ds = createDataSource(env)
  try {
    await ds.initialize()
    if (command === 'up') {
      const applied = await ds.runMigrations({ transaction: 'all' })
      process.stdout.write(applied.length ? `Migrations aplicadas: ${applied.map(item => item.name).join(', ')}\n` : 'Banco atualizado. Nenhuma migration pendente.\n')
    } else if (command === 'status') {
      const pending = await ds.showMigrations()
      process.stdout.write(pending ? 'Há migrations pendentes.\n' : 'Todas as migrations aplicadas.\n')
    } else {
      await ds.undoLastMigration({ transaction: 'all' })
      process.stdout.write('Última migration revertida no banco de testes.\n')
    }
  } finally {
    if (ds.isInitialized) await ds.destroy()
  }
}

void main().catch(error => {
  // Evitar serializar erro de conexão do driver (pode conter dados sensíveis).
  const message = error instanceof Error ? error.message : 'Falha ao executar migration.'
  process.stderr.write(message + '\n')
  process.exitCode = 1
})
