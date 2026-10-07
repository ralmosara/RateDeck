import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { Queue } from 'bullmq';
import { QUEUES } from '../../infrastructure/queue/queues';
import { cdrImports } from '../../infrastructure/database/schema/cdrs';
import { ENV, type Env } from '../../config/env';

@Injectable()
export class CdrService {
  private cdrQueue: Queue;

  constructor(
    @Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.cdrQueue = new Queue(QUEUES.cdrImport, {
      connection: { url: this.env.REDIS_URL },
    });
  }

  async importFile(accountId: number, accountPath: string, fileBuffer: Buffer, checksum: string) {
    // 1. Insert into cdr_imports
    const [importRecord] = await this.db.db.insert(cdrImports).values({
      accountId,
      accountPath,
      sourceFileSha256: checksum,
      status: 'queued',
    }).returning();

    // 2. Write file to local temp storage for the worker to read
    const { tmpdir } = await import('os');
    const { join } = await import('path');
    const { writeFile } = await import('fs/promises');
    const filePath = join(tmpdir(), `import-${importRecord.id}.csv`);
    await writeFile(filePath, fileBuffer);

    // 3. Enqueue split job
    await this.cdrQueue.add('import-cdr', {
      importId: importRecord.id,
      accountId,
      accountPath,
      filePath,
    }, {
      jobId: `import-${importRecord.id}` // idempotency key
    });

    return importRecord;
  }

  async listCdrs(accountPath: string, limit: number, cursor?: string, callee?: string) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      const { cdrs } = await import('../../infrastructure/database/schema/cdrs');
      const { desc, and, eq, sql } = await import('drizzle-orm');

      let query = tx.select().from(cdrs).orderBy(desc(cdrs.startTime), desc(cdrs.id)).limit(limit);

      const conditions = [];

      if (callee) {
        conditions.push(sql`${cdrs.callee} LIKE ${'%' + callee + '%'}`);
      }

      if (cursor) {
        // Cursor parsing logic... For simplicity, assuming cursor is just startTime string
        conditions.push(sql`${cdrs.startTime} < ${new Date(cursor)}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const rows = await query;
      const nextCursor = rows.length === limit ? rows[rows.length - 1].startTime.toISOString() : null;

      return {
        data: rows,
        nextCursor,
      };
    });
  }
}

