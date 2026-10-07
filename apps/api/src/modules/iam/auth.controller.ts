import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { 
  LoginRequest, 
  LoginResponse, 
  MfaVerifyRequest, 
  MfaSetupResponse, 
  MfaEnableRequest 
} from '@ratedeck/contracts';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginRequest, @Req() req: Request): Promise<LoginResponse> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(body, ip, userAgent);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async mfaVerify(@Body() body: MfaVerifyRequest, @Req() req: Request): Promise<LoginResponse> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.mfaVerify(body.mfaToken, body.code, ip, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string, @Req() req: Request): Promise<LoginResponse> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.refresh(refreshToken, ip, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body('refreshToken') refreshToken: string): Promise<void> {
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
  }

  // MFA Setup for logged-in users
  @UseGuards(JwtAuthGuard)
  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  async mfaSetup(@Req() req: any): Promise<MfaSetupResponse> {
    // req.user has userId and sub populated by JwtStrategy
    return this.mfaService.generateSetup(req.user.userId, 'user@ratedeck.com'); // TODO: Pass real email if needed or fetch from DB
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enable')
  @HttpCode(HttpStatus.OK)
  async mfaEnable(@Body() body: MfaEnableRequest, @Req() req: any): Promise<void> {
    await this.mfaService.enable(req.user.userId, body.code);
  }
}
