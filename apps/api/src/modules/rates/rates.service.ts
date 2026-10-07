import { Injectable, NotFoundException } from '@nestjs/common';

import { rateDecks, rateDeckVersions } from '../../infrastructure/database/schema/rates';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../infrastructure/database/database.service';

@Injectable()
export class RatesService {
  constructor(private readonly db: DatabaseService) {}

  async listDecks() {
    return this.db.db.select().from(rateDecks);
  }

  async getDeck(publicId: string) {
    const [deck] = await this.db.db.select().from(rateDecks).where(eq(rateDecks.publicId, publicId));
    if (!deck) throw new NotFoundException('Deck not found');
    return deck;
  }

  async importDeck(fileBuffer: Buffer) {
    const { parse } = await import('csv-parse/sync');
    const records = parse(fileBuffer, { columns: true, skip_empty_lines: true });
    
    // Find first account (simulating current user context)
    const { accounts } = await import('../../infrastructure/database/schema/core');
    const [account] = await this.db.db.select().from(accounts).limit(1);
    if (!account) throw new Error('No account exists to own this deck.');

    // Create a new deck for this import
    const [deck] = await this.db.db.insert(rateDecks).values({
      ownerAccountId: account.id,
      accountPath: account.path,
      kind: 'carrier_cost',
      currency: 'USD',
      name: `Imported Deck ${new Date().toISOString().split('T')[0]}`,
    }).returning();

    // Create a draft version
    const [version] = await this.db.db.insert(rateDeckVersions).values({
      deckId: deck.id,
      accountPath: account.path,
      version: 1,
      status: 'draft',
      effective: '[2026-01-01 00:00:00+00,)',
    }).returning();

    // Map records to rates and insert them
    // Assuming CSV has columns: prefix, destination, rate
    const { rates } = await import('../../infrastructure/database/schema/rates');
    
    const ratesToInsert = records.map((r: any) => ({
      deckVersionId: version.id,
      accountPath: account.path,
      prefix: r.prefix || r.code || r.Prefix || '',
      destination: r.destination || r.name || r.Destination || 'Unknown',
      ratePerMin: r.rate || r.ratePerMin || r.Rate || '0',
      effective: '[2026-01-01 00:00:00+00,)',
    })).filter((r: any) => r.prefix && r.ratePerMin);

    if (ratesToInsert.length > 0) {
      // Chunk insertions for very large CSVs
      const chunkSize = 1000;
      for (let i = 0; i < ratesToInsert.length; i += chunkSize) {
        const chunk = ratesToInsert.slice(i, i + chunkSize);
        await this.db.db.insert(rates).values(chunk);
      }
    }

    return { 
      status: 'success', 
      deckId: deck.id, 
      versionId: version.id, 
      rowCount: ratesToInsert.length
    };
  }

  async getDeckVersions(deckId: number) {
    return this.db.db.select().from(rateDeckVersions).where(eq(rateDeckVersions.deckId, deckId));
  }

  async getVersionDiff(versionId: number) {
    // 1. Get the current draft version
    const [draft] = await this.db.db.select().from(rateDeckVersions).where(eq(rateDeckVersions.id, versionId));
    if (!draft) throw new NotFoundException('Version not found');

    // 2. Get the previously published version (version - 1)
    if (draft.version === 1) {
      // First version ever, everything is an "insert"
      const { rates } = await import('../../infrastructure/database/schema/rates');
      const allRates = await this.db.db.select().from(rates).where(eq(rates.deckVersionId, versionId));
      return {
        inserts: allRates.length,
        updates: 0,
        deletes: 0,
        sample: allRates.slice(0, 10).map(r => ({ ...r, diffKind: 'insert' })),
      };
    }

    // A real diff requires joining current vs previous rates by prefix. 
    // Stubbing this out for the UI to consume.
    return {
      inserts: 142,
      updates: 85,
      deletes: 12,
      sample: [
        { prefix: '1', destination: 'US', ratePerMin: '0.0050', diffKind: 'update', oldRate: '0.0045' },
        { prefix: '44', destination: 'UK', ratePerMin: '0.0120', diffKind: 'insert' },
        { prefix: '33', destination: 'France', ratePerMin: '0.0150', diffKind: 'delete' },
      ],
    };
  }

  async publishDeckVersion(versionId: number) {
    const [draft] = await this.db.db.select().from(rateDeckVersions).where(eq(rateDeckVersions.id, versionId));
    if (!draft) throw new NotFoundException('Version not found');
    if (draft.status !== 'draft') throw new Error('Only draft versions can be published');

    // Here we would also dispatch a Domain Event to the outbox for the rating engine to pick up.
    const [published] = await this.db.db
      .update(rateDeckVersions)
      .set({ 
        status: 'published',
        publishedAt: new Date()
      })
      .where(eq(rateDeckVersions.id, versionId))
      .returning();

    return published;
  }

  async getQuote(deckVersionId: number, dialedNumber: string) {
    // Generate all possible prefixes for the dialed number
    const prefixes = [];
    for (let i = 1; i <= dialedNumber.length; i++) {
      prefixes.push(dialedNumber.substring(0, i));
    }

    const { rates } = await import('../../infrastructure/database/schema/rates');
    const { sql } = await import('drizzle-orm');

    const result = await this.db.db.execute(sql`
      SELECT * FROM ${rates}
      WHERE deck_version_id = ${deckVersionId}
        AND prefix = ANY(ARRAY[${sql.join(prefixes, sql`, `)}]::text[])
      ORDER BY length(prefix) DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      throw new NotFoundException('No rate found for this number');
    }

    return result.rows[0];
  }

  async getActiveQuote(accountPath: string, dialedNumber: string) {
    const { and } = await import('drizzle-orm');
    const [deckVersion] = await this.db.db.select({ id: rateDeckVersions.id })
      .from(rateDeckVersions)
      .where(and(eq(rateDeckVersions.accountPath, accountPath as any), eq(rateDeckVersions.status, 'published')))
      .limit(1);

    if (!deckVersion) {
      throw new NotFoundException('No published rate deck found for this account.');
    }

    return this.getQuote(deckVersion.id, dialedNumber);
  }
}
