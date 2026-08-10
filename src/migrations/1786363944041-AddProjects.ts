import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjects1786363944041 implements MigrationInterface {
  name = 'AddProjects1786363944041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organization_id" text NOT NULL, "name" character varying(200) NOT NULL, "description" text, "created_by" text NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_585c8ce06628c70b70100bfb84" ON "projects" ("organization_id") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ad0fe19546a13472d0d6804fd2" ON "projects" ("organization_id", "created_at") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ad0fe19546a13472d0d6804fd2"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_585c8ce06628c70b70100bfb84"`
    );
    await queryRunner.query(`DROP TABLE "projects"`);
  }
}
