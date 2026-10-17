import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Etapa 7.2: esquema inicial, sem seeds e sem dados pessoais.
 *
 * Identificadores do domínio são TEXT para aceitar IDs UUID novos e IDs legados do
 * catálogo do workspace v7. owner_id (UUID) será preenchido via sessão na 7.3.
 * A migração roda em transação controlada pelo DataSource.
 */
export class InitialDomainSchema1792200000000 implements MigrationInterface {
  name = 'InitialDomainSchema1792200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const statements: string[] = [
      `CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL,
        password_hash text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE UNIQUE INDEX idx_users_email_normalized ON users (lower(email))`,
      `CREATE TABLE clients (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL, contact text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(owner_id, id), CHECK (length(trim(name)) > 0)
      )`,
      `CREATE TABLE briefing_templates (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL, description text NOT NULL DEFAULT '',
        sections jsonb NOT NULL DEFAULT '[]'::jsonb,
        UNIQUE(owner_id,id), CHECK (jsonb_typeof(sections) = 'array'),
        CHECK (length(trim(name)) > 0)
      )`,
      `CREATE TABLE services (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL, hours numeric(12,2) NOT NULL DEFAULT 0,
        hourly_rate numeric(12,2) NOT NULL DEFAULT 0,
        extras numeric(12,2) NOT NULL DEFAULT 0, contingency numeric(7,4) NOT NULL DEFAULT 0,
        scope text NOT NULL DEFAULT '', exclusions text NOT NULL DEFAULT '',
        availability text NOT NULL DEFAULT '',
        task_templates jsonb NOT NULL DEFAULT '[]'::jsonb,
        briefing_template_id text,
        UNIQUE(owner_id,id),
        FOREIGN KEY (owner_id,briefing_template_id) REFERENCES briefing_templates(owner_id,id) ON DELETE SET NULL (briefing_template_id),
        CHECK (hours >= 0 AND hourly_rate >= 0 AND extras >= 0 AND contingency BETWEEN 0 AND 3),
        CHECK (jsonb_typeof(task_templates) = 'array'),
        CHECK (length(trim(name)) > 0)
      )`,
      `CREATE TABLE leads (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_id text, name text NOT NULL, contact text NOT NULL DEFAULT '',
        service text NOT NULL DEFAULT '', service_id text, converted_project_id text,
        stage varchar(16) NOT NULL DEFAULT 'novo', estimated_value numeric(14,2) NOT NULL DEFAULT 0,
        notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(owner_id,id),
        FOREIGN KEY(owner_id,client_id) REFERENCES clients(owner_id,id) ON DELETE SET NULL (client_id),
        FOREIGN KEY(owner_id,service_id) REFERENCES services(owner_id,id) ON DELETE SET NULL (service_id),
        CHECK(stage IN ('novo','conversa','proposta','ganho','perdido')),
        CHECK(estimated_value >= 0), CHECK(length(trim(name)) > 0)
      )`,
      `CREATE TABLE proposals (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lead_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(owner_id,id), UNIQUE(owner_id,lead_id),
        FOREIGN KEY(owner_id,lead_id) REFERENCES leads(owner_id,id) ON DELETE CASCADE
      )`,
      `CREATE TABLE proposal_revisions (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        proposal_id text NOT NULL, revision_number integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        service_name text NOT NULL, scope text NOT NULL DEFAULT '',
        exclusions text NOT NULL DEFAULT '', price numeric(14,2) NOT NULL DEFAULT 0,
        delivery_terms text NOT NULL DEFAULT '', revision_rounds integer NOT NULL DEFAULT 0,
        payment_terms text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '',
        status varchar(16) NOT NULL DEFAULT 'rascunho', sent_at timestamptz,
        UNIQUE(owner_id,id), UNIQUE(owner_id,proposal_id,revision_number),
        FOREIGN KEY(owner_id,proposal_id) REFERENCES proposals(owner_id,id) ON DELETE CASCADE,
        CHECK (price >= 0), CHECK(revision_rounds BETWEEN 0 AND 20),
        CHECK(status IN ('rascunho','enviada','aceita','recusada')),
        CHECK((status = 'rascunho' AND sent_at IS NULL) OR (status <> 'rascunho' AND sent_at IS NOT NULL)),
        CHECK(length(trim(service_name)) > 0)
      )`,
      `CREATE TABLE projects (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_id text, name text NOT NULL, client_name text NOT NULL,
        service_id text, source_lead_id text,
        status varchar(16) NOT NULL DEFAULT 'planejado',
        deadline date, contracted_value numeric(14,2) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(owner_id,id), UNIQUE(owner_id,source_lead_id),
        FOREIGN KEY(owner_id,client_id) REFERENCES clients(owner_id,id) ON DELETE SET NULL (client_id),
        FOREIGN KEY(owner_id,service_id) REFERENCES services(owner_id,id) ON DELETE SET NULL (service_id),
        FOREIGN KEY(owner_id,source_lead_id) REFERENCES leads(owner_id,id) ON DELETE SET NULL (source_lead_id),
        CHECK(status IN ('planejado','andamento','revisao','entregue')),
        CHECK(contracted_value >= 0),
        CHECK(length(trim(name)) > 0 AND length(trim(client_name)) > 0)
      )`,
      `ALTER TABLE leads ADD CONSTRAINT fk_leads_converted_project
        FOREIGN KEY(owner_id,converted_project_id) REFERENCES projects(owner_id,id)
        ON DELETE SET NULL (converted_project_id)`,
      `CREATE TABLE project_briefings (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id text NOT NULL, template_id text, template_name text NOT NULL,
        sections jsonb NOT NULL DEFAULT '[]'::jsonb,
        answers jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(owner_id,id), UNIQUE(owner_id,project_id),
        FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE,
        FOREIGN KEY(owner_id,template_id) REFERENCES briefing_templates(owner_id,id) ON DELETE SET NULL (template_id),
        CHECK(jsonb_typeof(sections) = 'array' AND jsonb_typeof(answers) = 'object')
      )`,
      `CREATE TABLE tasks (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id text, title text NOT NULL, done boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE SET NULL (project_id),
        CHECK(length(trim(title)) > 0)
      )`,
      `CREATE TABLE transactions (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id text, description text NOT NULL,
        kind varchar(12) NOT NULL, amount numeric(14,2) NOT NULL,
        date date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(owner_id,project_id,id,kind),
        FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE SET NULL (project_id),
        CHECK(kind IN ('entrada','saida')), CHECK(amount > 0), CHECK(length(trim(description)) > 0)
      )`,
      `CREATE TABLE project_installments (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id text NOT NULL, title text NOT NULL,
        amount numeric(14,2) NOT NULL, due_date date NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(owner_id,project_id,id),
        FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE,
        CHECK(amount > 0), CHECK(length(trim(title)) > 0)
      )`,
      `CREATE TABLE installment_receipts (
        owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id text NOT NULL,
        installment_id text NOT NULL, transaction_id text NOT NULL,
        receipt_kind varchar(12) NOT NULL DEFAULT 'entrada',
        PRIMARY KEY(owner_id,installment_id,transaction_id),
        UNIQUE(owner_id,transaction_id),
        FOREIGN KEY(owner_id,project_id,installment_id) REFERENCES project_installments(owner_id,project_id,id) ON DELETE CASCADE,
        FOREIGN KEY(owner_id,project_id,transaction_id,receipt_kind) REFERENCES transactions(owner_id,project_id,id,kind) ON DELETE CASCADE,
        CHECK(receipt_kind = 'entrada')
      )`,
      `CREATE TABLE project_materials (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id text NOT NULL, name text NOT NULL, category varchar(24) NOT NULL,
        url text NOT NULL, notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE,
        CHECK(category IN ('questionario','referencia','design','arquivo','documento','entrega','outro')),
        CHECK(length(trim(name)) > 0)
      )`,
      `CREATE TABLE project_deliveries (
        project_id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        review_sent_at date, approved_at date, delivered_at date,
        notes text NOT NULL DEFAULT '',
        FOREIGN KEY(owner_id,project_id) REFERENCES projects(owner_id,id) ON DELETE CASCADE,
        CHECK(approved_at IS NULL OR review_sent_at IS NULL OR approved_at >= review_sent_at),
        CHECK(delivered_at IS NULL OR approved_at IS NULL OR delivered_at >= approved_at),
        CHECK(delivered_at IS NULL OR review_sent_at IS NULL OR delivered_at >= review_sent_at)
      )`,
      `CREATE TABLE plan_items (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        week text NOT NULL DEFAULT '', title text NOT NULL, goal text NOT NULL DEFAULT '',
        priority text NOT NULL DEFAULT '', status varchar(20) NOT NULL DEFAULT 'nao-iniciado',
        hours numeric(12,2) NOT NULL DEFAULT 0, next_step text NOT NULL DEFAULT '',
        notes text NOT NULL DEFAULT '',
        CHECK(status IN ('nao-iniciado','andamento','concluido')), CHECK(hours >= 0)
      )`,
      `CREATE TABLE publications (
        id text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        week text NOT NULL DEFAULT '', channel text NOT NULL DEFAULT '',
        topic text NOT NULL, copy text NOT NULL DEFAULT '', audience text NOT NULL DEFAULT '',
        status varchar(16) NOT NULL DEFAULT 'planejado',
        result text NOT NULL DEFAULT '', url text NOT NULL DEFAULT '',
        CHECK(status IN ('planejado','produzindo','publicado'))
      )`,
      `CREATE INDEX idx_clients_owner ON clients(owner_id)`,
      `CREATE INDEX idx_services_owner ON services(owner_id)`,
      `CREATE INDEX idx_leads_owner_stage ON leads(owner_id,stage)`,
      `CREATE INDEX idx_leads_owner_created_at ON leads(owner_id,created_at DESC)`,
      `CREATE INDEX idx_proposal_revisions_proposal ON proposal_revisions(owner_id,proposal_id,revision_number DESC)`,
      `CREATE INDEX idx_projects_owner_status_deadline ON projects(owner_id,status,deadline)`,
      `CREATE INDEX idx_project_briefings_owner ON project_briefings(owner_id,project_id)`,
      `CREATE INDEX idx_tasks_owner_project_done ON tasks(owner_id,project_id,done)`,
      `CREATE INDEX idx_transactions_owner_date ON transactions(owner_id,date DESC)`,
      `CREATE INDEX idx_transactions_owner_project ON transactions(owner_id,project_id)`,
      `CREATE INDEX idx_installments_owner_due ON project_installments(owner_id,due_date)`,
      `CREATE INDEX idx_materials_owner_project ON project_materials(owner_id,project_id)`,
      `CREATE INDEX idx_deliveries_owner ON project_deliveries(owner_id)`,
      `CREATE INDEX idx_plan_owner ON plan_items(owner_id)`,
      `CREATE INDEX idx_publications_owner_status ON publications(owner_id,status)`,
    ]

    for (const statement of statements) await queryRunner.query(statement)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Somente para ambiente isolado de teste. Reverter apagará os dados destas tabelas.
    await queryRunner.query('ALTER TABLE leads DROP CONSTRAINT fk_leads_converted_project')
    for (const table of [
      'publications', 'plan_items', 'project_deliveries', 'project_materials',
      'installment_receipts', 'project_installments', 'transactions', 'tasks',
      'project_briefings', 'projects', 'proposal_revisions', 'proposals', 'leads',
      'services', 'briefing_templates', 'clients', 'users',
    ]) {
      await queryRunner.query(`DROP TABLE "${table}"`)
    }
  }
}
