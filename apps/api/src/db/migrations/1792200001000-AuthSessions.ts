import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Sessões opacas: só o SHA-256 do token vai para o PostgreSQL. */
export class AuthSessions1792200001000 implements MigrationInterface {
  name = 'AuthSessions1792200001000'
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE auth_sessions (
      token_hash char(64) PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      CHECK (expires_at > created_at)
    )`)
    await queryRunner.query('CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id)')
    await queryRunner.query('CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at)')
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    // Reversão é bloqueada fora do banco _test pelo comando db:revert:test.
    await queryRunner.query('DROP TABLE auth_sessions')
  }
}
