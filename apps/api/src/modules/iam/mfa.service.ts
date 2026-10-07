import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { eq, and } from 'drizzle-orm';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { users, mfaFactors } from '../../infrastructure/database/schema';

@Injectable()
export class MfaService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
  ) {
    authenticator.options = { window: 1 };
  }

  async generateSetup(userId: number, email: string): Promise<{ secret: string; qrCodeUrl: string }> {
    // Generate new secret
    const secret = authenticator.generateSecret();
    
    // Check if user already has an MFA factor
    const existing = await this.db.db.query.mfaFactors.findFirst({
      where: (f, { eq }) => eq(f.userId, userId),
    });

    if (existing) {
      if (existing.isActive) {
        throw new BadRequestException('MFA is already active');
      }
      
      await this.db.db.update(mfaFactors)
        .set({ secret, createdAt: new Date() })
        .where(eq(mfaFactors.id, existing.id));
    } else {
      await this.db.db.insert(mfaFactors).values({
        userId,
        type: 'totp',
        secret,
        isActive: false,
      });
    }

    const otpauth = authenticator.keyuri(email, 'RateDeck', secret);
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    return { secret, qrCodeUrl };
  }

  async enable(userId: number, code: string): Promise<void> {
    const factor = await this.db.db.query.mfaFactors.findFirst({
      where: (f, { eq, and }) => and(eq(f.userId, userId), eq(f.isActive, false)),
    });

    if (!factor) {
      throw new NotFoundException('No pending MFA setup found');
    }

    const isValid = authenticator.verify({ token: code, secret: factor.secret });
    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code');
    }

    // Mark as active
    await this.db.db.update(mfaFactors)
      .set({ isActive: true, lastVerifiedAt: new Date() })
      .where(eq(mfaFactors.id, factor.id));

    // Update user mfaEnabled flag
    await this.db.db.update(users)
      .set({ mfaEnabled: true })
      .where(eq(users.id, userId));
  }

  async verify(userId: number, code: string): Promise<boolean> {
    const factor = await this.db.db.query.mfaFactors.findFirst({
      where: (f, { eq, and }) => and(eq(f.userId, userId), eq(f.isActive, true)),
    });

    if (!factor) {
      return false;
    }

    const isValid = authenticator.verify({ token: code, secret: factor.secret });
    if (isValid) {
      await this.db.db.update(mfaFactors)
        .set({ lastVerifiedAt: new Date() })
        .where(eq(mfaFactors.id, factor.id));
    }

    return isValid;
  }
}
