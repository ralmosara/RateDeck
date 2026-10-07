import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { JwtService } from '@nestjs/jwt';
import { accounts, users, auditLog, impersonationSessions } from '../../infrastructure/database/schema/core';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class ImpersonationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async impersonate(currentUser: any, targetAccountId: number) {
    // 1. Fetch the target account
    const [targetAccount] = await this.db.db.select().from(accounts).where(eq(accounts.id, targetAccountId));
    
    if (!targetAccount) {
      throw new NotFoundException('Target account not found');
    }

    // 2. Check if the current user has access to the target account (hierarchy check)
    // The target account's path must start with the current user's account path
    if (!targetAccount.path.startsWith(currentUser.accountPath)) {
      throw new ForbiddenException('You cannot impersonate an account outside your hierarchy');
    }

    // 3. Find the primary user for the target account (or create an impersonation session)
    // For simplicity, we create a token that acts on behalf of the target account directly,
    // using the current user as the actor.
    const [targetUser] = await this.db.db.select().from(users).where(eq(users.accountId, targetAccountId)).limit(1);
    
    if (!targetUser) {
      throw new NotFoundException('Target account has no users');
    }

    // 4. Create Audit Log
    await this.db.db.insert(auditLog).values({
      actorUserId: currentUser.userId,
      effectiveUserId: targetUser.id,
      accountPath: currentUser.accountPath, // The actor's scope
      action: 'impersonate',
      resourceType: 'account',
      resourceId: String(targetAccountId),
      ip: '0.0.0.0', // In real life, grab from req
    });

    // 5. Generate impersonation JWT
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour impersonation limit

    // Store in DB
    await this.db.db.insert(impersonationSessions).values({
      adminUserId: currentUser.userId,
      targetUserId: targetUser.id,
      tokenHash,
      expiresAt,
    });

    const payload = {
      sub: targetUser.publicId,
      userId: targetUser.id,
      accountId: targetAccount.id,
      accountPath: targetAccount.path,
      act: {
        sub: currentUser.sub, // The real actor
        userId: currentUser.userId,
      },
      impersonationToken: rawToken,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      impersonatedAccount: {
        id: targetAccount.publicId,
        name: targetAccount.name,
      }
    };
  }
}
