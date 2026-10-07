import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { tickets, ticketMessages } from '../../infrastructure/database/schema/support';
import { eq, desc } from 'drizzle-orm';

export interface CreateTicketDto {
  subject: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
}

export interface CreateMessageDto {
  body: string;
  isInternalNote?: boolean;
}

@Injectable()
export class SupportService {
  constructor(private readonly db: DatabaseService) {}

  async listTickets(accountPath: string, limit = 50) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      return tx.select().from(tickets).orderBy(desc(tickets.createdAt)).limit(limit);
    });
  }

  async createTicket(accountId: number, accountPath: string, userId: number, dto: CreateTicketDto) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      const [ticket] = await tx.insert(tickets).values({
        accountId,
        accountPath,
        subject: dto.subject,
        priority: dto.priority,
        createdBy: userId,
      }).returning();

      await tx.insert(ticketMessages).values({
        ticketId: ticket.id,
        authorId: userId,
        body: dto.message,
        isInternalNote: 'false'
      });

      return ticket;
    });
  }

  async getTicket(accountPath: string, publicId: string) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      const [ticket] = await tx.select().from(tickets).where(eq(tickets.publicId, publicId));
      if (!ticket) throw new NotFoundException('Ticket not found');

      const messages = await tx.select().from(ticketMessages)
        .where(eq(ticketMessages.ticketId, ticket.id))
        .orderBy(ticketMessages.createdAt);

      return { ticket, messages };
    });
  }

  async addMessage(accountPath: string, ticketPublicId: string, userId: number, dto: CreateMessageDto) {
    return this.db.withTenantScope(accountPath, async (tx) => {
      const [ticket] = await tx.select().from(tickets).where(eq(tickets.publicId, ticketPublicId));
      if (!ticket) throw new NotFoundException('Ticket not found');

      const [msg] = await tx.insert(ticketMessages).values({
        ticketId: ticket.id,
        authorId: userId,
        body: dto.body,
        isInternalNote: dto.isInternalNote ? 'true' : 'false'
      }).returning();

      return msg;
    });
  }
}
