import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { users, userRoles } from '../../infrastructure/database/schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  async findByEmail(email: string) {
    const user = await this.db.db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    return user || null;
  }

  async findById(id: number) {
    const user = await this.db.db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return user || null;
  }

  async createRootUser(email: string, plainPassword: string) {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await argon2.hash(plainPassword);

    return this.db.withTenantScope('root', async (tx) => {
      // Hardcode to the root platform account which is ID 1 per migration
      const rootAccount = await tx.query.accounts.findFirst({
        where: (acc, { eq }) => eq(acc.type, 'platform'),
      });

      if (!rootAccount) {
        throw new NotFoundException('Root account not found. Did you run migrations?');
      }

      const [user] = await tx.insert(users).values({
        email: email.toLowerCase(),
        passwordHash,
        accountId: rootAccount.id,
        accountPath: rootAccount.path,
        displayName: 'System Admin',
        status: 'active',
      }).returning();

      // Assign admin role to root user
      const adminRole = await tx.query.roles.findFirst({
        where: (role, { eq }) => eq(role.key, 'admin'),
      });

      if (adminRole && user) {
        await tx.insert(userRoles).values({
          userId: user.id,
          roleId: adminRole.id,
        });
      }

      if (!user) {
        throw new ConflictException('Failed to insert user');
      }

      return user;
    });
  }
}
