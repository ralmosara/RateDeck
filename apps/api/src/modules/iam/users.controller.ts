import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtPayload } from './jwt.strategy';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: JwtPayload) {
    const profile = await this.usersService.findById(user.userId);
    if (!profile) {
      return null;
    }
    return {
      id: profile.publicId,
      email: profile.email,
      displayName: profile.displayName,
      status: profile.status,
    };
  }
}
