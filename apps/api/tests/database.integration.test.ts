import test from 'node:test'
import assert from 'node:assert/strict'
import { parseEnv } from '../src/config/env.js'
import { createDataSource } from '../src/db/dataSource.js'

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
    assert.equal(migrated.length, 2)
    assert.equal((await ds.runMigrations({ transaction: 'all' })).length, 0, 'Migration deve ser idempotente.')
    const tables = (await ds.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)) as Array<{ tablename: string }>
    const names = new Set(tables.map(row => row.tablename))
    for (const name of [
      'users', 'clients', 'services', 'briefing_templates', 'leads', 'proposals',
      'proposal_revisions', 'projects', 'project_briefings', 'tasks', 'transactions',
      'project_installments', 'installment_receipts', 'project_materials',
      'project_deliveries', 'plan_items', 'publications', 'auth_sessions', 'schema_migrations',
    ]) assert.ok(names.has(name), `Tabela esperada não encontrada: ${name}`)

    const id1 = '11111111-1111-4111-8111-111111111111'
    const id2 = '22222222-2222-4222-8222-222222222222'
    await ds.query('INSERT INTO users(id,email) VALUES($1,$2),($3,$4)',
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
    const after = await ds.query(`SELECT to_regclass('public.projects') AS project_table`)
    assert.equal(after[0].project_table, null)
  } finally {
    if (ds.isInitialized) await ds.destroy()
  }
})
