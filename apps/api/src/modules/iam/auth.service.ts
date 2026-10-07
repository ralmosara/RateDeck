import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { LoginRequest, LoginResponse } from '@ratedeck/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { users, sessions } from '../../infrastructure/database/schema';
import { UsersService } from './users.service';
import { MfaService } from './mfa.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(MfaService) private readonly mfaService: MfaService,
  ) {}

  async login(req: LoginRequest, ip?: string, userAgent?: string): Promise<LoginResponse> {
    const user = await this.usersService.findByEmail(req.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    const passwordValid = await argon2.verify(user.passwordHash, req.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.mfaEnabled) {
      // Issue a temporary token for MFA verification
      const mfaToken = this.jwtService.sign(
        { sub: user.publicId, userId: user.id, mfaPending: true },
        { expiresIn: '5m' },
      );
      return { mfaRequired: true, mfaToken };
    }

    return this.generateSessionAndTokens(user, ip, userAgent);
  }

  async mfaVerify(mfaToken: string, code: string, ip?: string, userAgent?: string): Promise<LoginResponse> {
    let payload;
    try {
      payload = this.jwtService.verify(mfaToken);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired MFA token');
    }

    if (!payload.mfaPending) {
      throw new UnauthorizedException('Invalid token usage');
    }

    const isValid = await this.mfaService.verify(payload.userId, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    const user = await this.usersService.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateSessionAndTokens(user, ip, userAgent);
  }

  private async generateSessionAndTokens(user: any, ip?: string, userAgent?: string): Promise<LoginResponse> {
    // Fetch account details
    const account = await this.db.db.query.accounts.findFirst({
      where: (acc, { eq }) => eq(acc.id, user.accountId),
    });

    if (!account) {
      throw new UnauthorizedException('User account missing');
    }

    // Fetch user roles and permissions
    const userRoles = await this.db.db.query.userRoles.findMany({
      where: (ur, { eq }) => eq(ur.userId, user.id),
    });

    const roleIds = userRoles.map(ur => ur.roleId);
    
    let permissions: string[] = [];
    if (roleIds.length > 0) {
      const rps = await this.db.db.query.rolePermissions.findMany({
        where: (rp, { inArray }) => inArray(rp.roleId, roleIds),
      });
      permissions = [...new Set(rps.map(rp => rp.permissionKey))];
    }

    // Update last login
    await this.db.db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    const tokenPayload = {
      sub: user.publicId,
      userId: user.id,
      accountId: account.id,
      accountPath: account.path,
    };

    const accessToken = await this.jwtService.signAsync(tokenPayload);

    // Generate refresh token and save session
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.db.db.insert(sessions).values({
      userId: user.id,
      tokenHash,
      ip,
      userAgent,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.publicId,
        accountId: account.publicId,
        accountPath: user.accountPath as string,
        email: user.email,
        displayName: user.displayName,
        mfaEnabled: user.mfaEnabled,
        status: user.status as any,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
      },
      account: {
        id: account.publicId,
        parentId: null,
        type: account.type as any,
        path: account.path as string,
        name: account.name,
        status: account.status as any,
        currency: account.currency,
        timezone: account.timezone,
        billingMode: account.billingMode as any,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      },
      permissions,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.db.db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  async refresh(refreshToken: string, ip?: string, userAgent?: string): Promise<LoginResponse> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const session = await this.db.db.query.sessions.findFirst({
      where: (s, { eq, and, gt }) => and(
        eq(s.tokenHash, tokenHash),
        gt(s.expiresAt, new Date())
      )
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(session.userId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User inactive or missing');
    }

    // Delete old session
    await this.db.db.delete(sessions).where(eq(sessions.id, session.id));

    return this.generateSessionAndTokens(user, ip, userAgent);
  }
}
