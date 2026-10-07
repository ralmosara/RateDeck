import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { carriers, trunks } from '../../infrastructure/database/schema/carriers';
import { eq, and } from 'drizzle-orm';

export interface CreateCarrierDto {
  name: string;
}

export interface CreateTrunkDto {
  carrierId?: number;
  name: string;
  direction: 'inbound' | 'outbound' | 'both';
  host: string;
  authUsername?: string;
  authPassword?: string;
}

@Injectable()
export class CarriersService {
  constructor(private readonly db: DatabaseService) {}

  async listCarriers(accountPath: string) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      return tx.select().from(carriers);
    });
  }

  async getCarrier(accountPath: string, publicId: string) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      const [carrier] = await tx.select().from(carriers).where(eq(carriers.publicId, publicId));
      if (!carrier) throw new NotFoundException('Carrier not found');
      return carrier;
    });
  }

  async createCarrier(accountId: number, accountPath: string, dto: CreateCarrierDto) {
    // In a real application, tenant scope might enforce accountPath on insert via a trigger or default,
    // but here we pass it explicitly.
    const [carrier] = await this.db.db.insert(carriers).values({
      accountId,
      accountPath,
      name: dto.name,
    }).returning();
    return carrier;
  }

  async listTrunks(accountPath: string, carrierId?: number) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      let query = tx.select().from(trunks);
      if (carrierId) {
        query = query.where(eq(trunks.carrierId, carrierId)) as any;
      }
      return query;
    });
  }

  async createTrunk(accountId: number, accountPath: string, dto: CreateTrunkDto) {
    const [trunk] = await this.db.db.insert(trunks).values({
      accountId,
      accountPath,
      carrierId: dto.carrierId,
      name: dto.name,
      direction: dto.direction,
      host: dto.host,
      authUsername: dto.authUsername,
      authPassword: dto.authPassword,
    }).returning();
    return trunk;
  }
}
