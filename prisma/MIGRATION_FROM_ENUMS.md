# Migrating from enum-based pipeline / project / proposal status

If your database was created **before** workflow tables (`LeadPipelineStage`, `ProjectStatusOption`, `ProposalStatusOption`) and FK columns (`Lead.stageId`, `Project.statusId`, `Proposal.statusId`), `prisma db push` cannot add **required** FK columns while old enum columns and rows still exist without a data backfill.

**Development (discard data):**

```bash
npm run db:reset
```

This runs `prisma db push --force-reset` and `prisma/seed.ts`.

**Production / keep data:** create a custom migration that:

1. Creates the three workflow tables and seeds rows (or run a script that inserts rows with stable `key` values matching your old enums).
2. Adds nullable `stageId`, `statusId` (proposal) columns.
3. Updates each row: set FKs by joining `key` to the old enum string stored in legacy columns.
4. Alters columns to `NOT NULL`, drops legacy enum columns, and removes old Prisma enums from the database if applicable.

Then run `prisma migrate deploy` (or your hosting equivalent).
