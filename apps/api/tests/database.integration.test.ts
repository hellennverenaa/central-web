import test from 'node:test'
import assert from 'node:assert/strict'
import { parseEnv } from '../src/config/env.js'
import { createDataSource } from '../src/db/dataSource.js'
import { AuthService } from '../src/auth/service.js'
import { sessionDigest } from '../src/auth/session.js'
import { hashPassword } from '../src/auth/password.js'
import { DataSource } from 'typeorm'
import { InitialDomainSchema1792200000000 } from '../src/db/migrations/1792200000000-InitialDomainSchema.js'
import { AuthSessions1792200001000 } from '../src/db/migrations/1792200001000-AuthSessions.js'

const enabled = process.env.TEST_DATABASE === '1'

test('migration PostgreSQL real: tabelas, constraints, isolamento e rollback em banco de teste', { skip: !enabled }, async () => {
  const env = parseEnv(process.env)
  // Nunca executar a limpeza de integração na base de desenvolvimento da usuária.
  assert.match(env.DB_NAME, /_test$/, 'Use um banco exclusivo com sufixo _test para integração.')
  assert.equal(env.NODE_ENV, 'test', 'TEST_DATABASE exige NODE_ENV=test.')
  const ds = createDataSource(env)
  await ds.initialize()
  try {
    assert.equal(ds.options.synchronize, false)
    const migrated = await ds.runMigrations({ transaction: 'all' })
    assert.equal(migrated.length, 3)
    assert.equal((await ds.runMigrations({ transaction: 'all' })).length, 0, 'Migration deve ser idempotente.')
    const tables = (await ds.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)) as Array<{ tablename: string }>
    const names = new Set(tables.map(row => row.tablename))
    for (const name of [
      'clients', 'services', 'briefing_templates', 'leads', 'proposals',
      'proposal_revisions', 'projects', 'project_briefings', 'tasks', 'transactions',
      'project_installments', 'installment_receipts', 'project_materials',
      'project_deliveries', 'plan_items', 'publications', 'schema_migrations',
    ]) assert.ok(names.has(name), `Tabela esperada não encontrada: ${name}`)

    const authTables = (await ds.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'auth'`)) as Array<{ tablename: string }>
    assert.deepEqual(authTables.map(row => row.tablename).sort(), ['auth_sessions', 'users'])
    assert.equal((await ds.query(`SELECT to_regclass('public.users') AS table_name`))[0].table_name, null)
    assert.equal((await ds.query(`SELECT to_regclass('auth.users') AS table_name`))[0].table_name, 'auth.users')

    // O primeiro titular só pode ser criado via comando local, nunca por endpoint público.
    const auth = new AuthService(ds)
    const owner = await auth.createFirstOwner('titular@example.invalid', 'senha-teste-ficticia-123')
    assert.match(owner.id, /^[0-9a-f-]{36}$/)
    await assert.rejects(
      () => auth.createFirstOwner('segundo@example.invalid', 'senha-teste-ficticia-456'),
      /Já existe um titular/,
    )
    assert.equal(await auth.login(owner.email, 'senha-incorreta-123'), null)
    const login = await auth.login(owner.email, 'senha-teste-ficticia-123')
    assert.ok(login)
    assert.equal(login.user.email, owner.email)
    const savedSession = await ds.query('SELECT token_hash FROM auth.auth_sessions WHERE user_id=$1', [owner.id])
    assert.equal(savedSession[0].token_hash, sessionDigest(login.token))
    assert.notEqual(savedSession[0].token_hash, login.token)
    assert.deepEqual(await auth.getUser(login.token), login.user)
    assert.equal(await auth.getUser('b'.repeat(64)), null)
    await ds.query(`UPDATE auth.auth_sessions
      SET created_at=now()-interval '9 days', expires_at=now()-interval '1 day'
      WHERE user_id=$1`, [owner.id])
    assert.equal(await auth.getUser(login.token), null, 'Sessão expirada não autentica.')
    await auth.logout(login.token)
    assert.equal((await ds.query('SELECT count(*)::integer AS total FROM auth.auth_sessions'))[0].total, 0)

    const id1 = '11111111-1111-4111-8111-111111111111'
    const id2 = '22222222-2222-4222-8222-222222222222'
    await ds.query('INSERT INTO auth.users(id,email) VALUES($1,$2),($3,$4)',
      [id1, 'proprietaria1@example.invalid', id2, 'proprietaria2@example.invalid'])
    await ds.query('INSERT INTO clients(id,owner_id,name) VALUES($1,$2,$3)',
      ['cliente-a', id1, 'Cliente fictício'])
    await ds.query('INSERT INTO services(id,owner_id,name) VALUES($1,$2,$3)',
      ['servico-a', id1, 'Landing page'])
    await assert.rejects(() => ds.query(
      'INSERT INTO leads(id,owner_id,name,service_id) VALUES($1,$2,$3,$4)',
      ['lead-de-outro-titular', id2, 'Negócio fictício', 'servico-a']),
    'Titular não pode vincular modelo de outro titular')
    await ds.query('INSERT INTO leads(id,owner_id,name,service_id,estimated_value) VALUES($1,$2,$3,$4,$5)',
      ['lead-a', id1, 'Pessoa fictícia', 'servico-a', '150'])
    await ds.query('INSERT INTO projects(id,owner_id,name,client_name,source_lead_id,service_id,contracted_value) VALUES($1,$2,$3,$4,$5,$6,$7)',
      ['project-a', id1, 'Site demonstração', 'Pessoa fictícia', 'lead-a', 'servico-a', '900'])
    await ds.query(`INSERT INTO proposals(id,owner_id,lead_id) VALUES($1,$2,$3)`, ['prop-a', id1, 'lead-a'])
    await ds.query(`INSERT INTO proposal_revisions
      (id,owner_id,proposal_id,revision_number,service_name,price,status,sent_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['revision-a', id1, 'prop-a', 1, 'Site', '650', 'enviada', new Date('2026-10-17T00:00:00Z')])
    await assert.rejects(() => ds.query(`INSERT INTO proposal_revisions
      (id,owner_id,proposal_id,revision_number,service_name,price,status,sent_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['revision-duplicate', id1, 'prop-a', 1, 'Site', '650', 'enviada', new Date('2026-10-17T00:00:00Z')]),
    'Não deve haver números de versão duplicados')
    await ds.query(`INSERT INTO transactions(id,owner_id,project_id,description,kind,amount,date)
      VALUES ($1,$2,$3,$4,'entrada',$5,$6),($7,$2,$3,$8,'saida',$9,$6)`,
      ['recibo-a', id1, 'project-a', 'Sinal confirmado', '200', '2026-10-17',
        'despesa-a', 'Custo de criação', '40'])
    await ds.query(`INSERT INTO project_installments(id,owner_id,project_id,title,amount,due_date)
      VALUES($1,$2,$3,$4,$5,$6),($7,$2,$3,$8,$9,$10)`,
      ['parcela-a', id1, 'project-a', 'Sinal', '450', '2026-10-20',
        'parcela-b', 'Final', '450', '2026-11-20'])
    await ds.query(`INSERT INTO installment_receipts(owner_id,project_id,installment_id,transaction_id)
      VALUES($1,$2,$3,$4)`, [id1, 'project-a', 'parcela-a', 'recibo-a'])
    await assert.rejects(() => ds.query(`INSERT INTO installment_receipts(owner_id,project_id,installment_id,transaction_id)
      VALUES($1,$2,$3,$4)`, [id1, 'project-a', 'parcela-b', 'recibo-a']),
    'Uma receita não pode ser contada em duas parcelas')
    await assert.rejects(() => ds.query(`INSERT INTO installment_receipts(owner_id,project_id,installment_id,transaction_id)
      VALUES($1,$2,$3,$4)`, [id1, 'project-a', 'parcela-b', 'despesa-a']),
    'Uma despesa nunca pode ser vinculada como recebimento')
    const planned = await ds.query('SELECT COALESCE(sum(amount),0)::text AS amount FROM project_installments')
    const cash = await ds.query(`SELECT COALESCE(sum(amount),0)::text AS amount FROM transactions WHERE kind='entrada'`)
    assert.equal(planned[0].amount, '900.00')
    assert.equal(cash[0].amount, '200.00')
    const schema = ds.entityMetadatas.map(meta => meta.tableName)
    assert.equal(schema.length, 17)
    assert.ok(schema.includes('project_installments'))

    // Banco exclusivo _test: garante down sem apagar dados reais.
    await ds.undoLastMigration({ transaction: 'all' })
    await ds.undoLastMigration({ transaction: 'all' })
    await ds.undoLastMigration({ transaction: 'all' })
    const after = await ds.query(`SELECT to_regclass('public.projects') AS project_table`)
    assert.equal(after[0].project_table, null)

    assert.equal((await ds.query(`SELECT to_regnamespace('auth') AS ns`))[0].ns, null)

    // Em um ambiente já configurado, a migration deve preservar contas,
    // hashes, sessões e referências de projetos antes existentes em public.
    const oldDb = new DataSource({
      ...ds.options,
      migrations: [InitialDomainSchema1792200000000, AuthSessions1792200001000],
    })
    await oldDb.initialize()
    try {
      assert.equal((await oldDb.runMigrations({ transaction: 'all' })).length, 2)
      const priorId = '33333333-3333-4333-8333-333333333333'
      const priorToken = 'c'.repeat(64)
      const priorHash = await hashPassword('senha-de-teste-migracao-123')
      await oldDb.query(
        'INSERT INTO public.users(id,email,password_hash) VALUES($1,$2,$3)',
        [priorId, 'conta-antiga@example.invalid', priorHash])
      await oldDb.query(
        'INSERT INTO public.auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',
        [sessionDigest(priorToken), priorId, new Date(Date.now() + 86400_000)])
      await oldDb.query(
        'INSERT INTO public.clients(id,owner_id,name) VALUES($1,$2,$3)',
        ['cliente-legado', priorId, 'Cliente ilustrativo'])
    } finally {
      await oldDb.destroy()
    }

    assert.equal((await ds.runMigrations({ transaction: 'all' })).length, 1,
      'Somente a migration de mudança de schema deve estar pendente.')
    const oldToken = 'c'.repeat(64)
    const preservedUser = await new AuthService(ds).getUser(oldToken)
    assert.equal(preservedUser?.email, 'conta-antiga@example.invalid')
    assert.ok(await new AuthService(ds).login('conta-antiga@example.invalid', 'senha-de-teste-migracao-123'))
    const preservedClient = await ds.query(
      'SELECT owner_id FROM public.clients WHERE id=$1', ['cliente-legado'])
    assert.equal(preservedClient[0].owner_id, preservedUser?.id)
    assert.equal((await ds.query(`SELECT to_regclass('public.auth_sessions') AS table_name`))[0].table_name, null)
    assert.equal((await ds.query(`SELECT to_regclass('auth.auth_sessions') AS table_name`))[0].table_name, 'auth.auth_sessions')

    // Reverter somente em banco descartável preserva novamente os dados,
    // antes da reversão completa das duas migrations históricas.
    await ds.undoLastMigration({ transaction: 'all' })
    assert.equal((await ds.query(`SELECT to_regclass('public.users') AS table_name`))[0].table_name, 'users')
    assert.equal((await ds.query(
      'SELECT count(*)::integer AS total FROM public.users WHERE email=$1',
      ['conta-antiga@example.invalid']))[0].total, 1)
    await ds.undoLastMigration({ transaction: 'all' })
    await ds.undoLastMigration({ transaction: 'all' })
    assert.equal((await ds.query(`SELECT to_regclass('public.users') AS table_name`))[0].table_name, null)

  } finally {
    if (ds.isInitialized) await ds.destroy()
  }
})
