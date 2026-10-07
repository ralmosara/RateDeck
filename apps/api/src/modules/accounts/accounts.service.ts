import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { accounts } from '../../infrastructure/database/schema/core';
import { eq, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';

@Injectable()
export class AccountsService {
  constructor(private readonly db: DatabaseService) {}

  async listAccounts() {
    return this.db.db.select().from(accounts);
  }

  async getAccount(publicId: string) {
    const [account] = await this.db.db.select().from(accounts).where(eq(accounts.publicId, publicId));
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async createAccount(data: { name: string; parentId?: number }) {
    try {
      const [account] = await this.db.db.insert(accounts).values({
        name: data.name,
        parentId: data.parentId || null,
        type: 'customer',
        path: 'root', // This is just a stub since calculating ltree path requires logic
        currency: 'USD',
        timezone: 'UTC',
        billingMode: 'prepaid',
        status: 'active',
      }).returning();
      return account;
    } catch (e: any) {
      if (e.code === '23505') throw new ConflictException('Account already exists');
      throw e;
    }
  }
}
