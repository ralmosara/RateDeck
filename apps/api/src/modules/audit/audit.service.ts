import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { auditLog } from '../../infrastructure/database/schema/core';

export interface CreateAuditLogDto {
  actorUserId?: number;
  effectiveUserId?: number;
  accountPath: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  correlationId?: string;
  changes?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async log(dto: CreateAuditLogDto) {
    await this.db.db.insert(auditLog).values({
      actorUserId: dto.actorUserId,
      effectiveUserId: dto.effectiveUserId,
      accountPath: dto.accountPath,
      action: dto.action,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      ip: dto.ip,
      userAgent: dto.userAgent,
      correlationId: dto.correlationId,
      changes: dto.changes,
    });
  }

  async list(accountPath: string, limit = 50, offset = 0) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      // In a real application we would use cursor pagination
      return tx.select().from(auditLog).limit(limit).offset(offset);
    });
  }
}
