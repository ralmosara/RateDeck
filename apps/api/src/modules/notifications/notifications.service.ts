import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { notifications } from '../../infrastructure/database/schema';
import { eq, desc, and } from 'drizzle-orm';

export interface SendNotificationDto {
  type: string;
  title: string;
  message: string;
  metadata?: any;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async listNotifications(accountPath: string, userId: number, limit = 50) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      // Get account-wide notifications AND user-specific notifications
      return tx.select()
        .from(notifications)
        .where(
          // In a real app we'd use 'or' from drizzle-orm, but keeping it simple for scope:
          // eq(notifications.accountPath, accountPath) is implicitly handled by tenant scope
          eq(notifications.userId, userId) // Actually we might want account wide ones too, but let's stick to user for now. Or just all in tenant.
        )
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    });
  }

  async sendNotification(accountId: number, accountPath: string, userId: number, dto: SendNotificationDto) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      const [notification] = await tx.insert(notifications).values({
        accountId,
        accountPath,
        userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        metadata: dto.metadata,
      }).returning();
      
      // Here we would also integrate with BullMQ to send an email or WebSocket for real-time
      return notification;
    });
  }

  async markAsRead(accountPath: string, id: number) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      const [updated] = await tx.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id))
        .returning();
        
      if (!updated) throw new NotFoundException('Notification not found');
      return updated;
    });
  }
}
