import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Move apenas as tabelas da autenticação, sem recriá-las.
 * ALTER TABLE SET SCHEMA preserva linhas, índices e chaves estrangeiras existentes.
 * `public.schema_migrations` permanece no schema padrão do TypeORM.
 *
 * Aplicada após InitialDomainSchema e AuthSessions; segura para um ambiente que
 * já contém a conta inicial e sessões emitidas localmente.
 */
export class SeparateAuthSchema1792200002000 implements MigrationInterface {
  name = 'SeparateAuthSchema1792200002000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS auth')
    await queryRunner.query('ALTER TABLE public.users SET SCHEMA auth')
    await queryRunner.query('ALTER TABLE public.auth_sessions SET SCHEMA auth')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Só em banco _test: CLI de desenvolvimento não permite reversão destrutiva.
    await queryRunner.query('ALTER TABLE auth.auth_sessions SET SCHEMA public')
    await queryRunner.query('ALTER TABLE auth.users SET SCHEMA public')
    await queryRunner.query('DROP SCHEMA auth')
  }
}
