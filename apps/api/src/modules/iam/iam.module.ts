import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ENV, Env } from '../../config/env';
import { ImpersonationController } from './impersonation.controller';
import { ImpersonationService } from './impersonation.service';
import { MfaService } from './mfa.service';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        secret: env.JWT_SECRET,
        signOptions: { expiresIn: '15m' }, // Short-lived access token
      }),
    }),
  ],
  controllers: [AuthController, UsersController, ImpersonationController],
  providers: [AuthService, UsersService, JwtStrategy, ImpersonationService, MfaService],
  exports: [AuthService, UsersService, ImpersonationService, MfaService],
})
export class IamModule {}
