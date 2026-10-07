import { Inject, Injectable, Logger, OnModuleInit, OnApplicationShutdown, forwardRef } from '@nestjs/common';
import { Worker, Queue } from 'bullmq';
import { ENV, type Env } from '../../config/env';
import { QUEUES } from '../../infrastructure/queue/queues';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { cdrImports, cdrs } from '../../infrastructure/database/schema/cdrs';
import { eq } from 'drizzle-orm';
import { readFile, unlink } from 'fs/promises';
import { parse } from 'csv-parse/sync';

@Injectable()
export class CdrIngestProcessor implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(CdrIngestProcessor.name);
  private worker?: Worker;
  private ratingQueue: Queue;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService,
  ) {
    this.ratingQueue = new Queue(QUEUES.rating, { connection: { url: this.env.REDIS_URL } });
  }

  onModuleInit(): void {
    this.worker = new Worker(
      QUEUES.cdrImport,
      async (job) => {
        this.logger.log(`Processing cdr-import job ${job.id}`);
        const { importId, accountId, accountPath, filePath } = job.data;

        await this.db.db.update(cdrImports).set({ status: 'processing' }).where(eq(cdrImports.id, importId));

        try {
          const fileContent = await readFile(filePath, 'utf-8');
          const records = parse(fileContent, { columns: true, skip_empty_lines: true });

          const toInsert = records.map((r: any, i: number) => ({
            startTime: new Date(r.start_time || r.StartTime || Date.now()),
            accountId,
            accountPath,
            sourceId: 1, // Defaulting for import
            externalCallId: r.external_call_id || r.CallId || `import-${importId}-row-${i}`,
            caller: r.caller || r.Caller || '',
            callee: r.callee || r.Callee || '',
            durationSec: parseInt(r.duration || r.Duration || '0', 10),
            disposition: r.disposition || r.Disposition || 'ANSWERED',
          })).filter((r: any) => r.callee);

          if (toInsert.length > 0) {
            // Chunked insertion
            const chunkSize = 1000;
            for (let i = 0; i < toInsert.length; i += chunkSize) {
              const chunk = toInsert.slice(i, i + chunkSize);
              await this.db.db.insert(cdrs).values(chunk).onConflictDoNothing();
            }
          }

          await this.db.db.update(cdrImports).set({ 
            status: 'completed', 
            rowCount: toInsert.length 
          }).where(eq(cdrImports.id, importId));
          
          await unlink(filePath).catch(() => {});

          // Queue rating job
          await this.ratingQueue.add('rate-account', { accountId, accountPath }, { jobId: `rate-${importId}` });

          return { ok: true, importedId: importId, rows: toInsert.length };
        } catch (err: any) {
          await this.db.db.update(cdrImports).set({ status: 'failed' }).where(eq(cdrImports.id, importId));
          throw err;
        }
      },
      { connection: { url: this.env.REDIS_URL, maxRetriesPerRequest: null }, concurrency: 2 },
    );
    this.worker.on('failed', (job, err) => this.logger.error(`CDR Ingest Job ${job?.id} failed: ${err.message}`));
    this.logger.log(`Worker consuming queue "${QUEUES.cdrImport}"`);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}
