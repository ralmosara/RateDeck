import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../iam/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  listAccounts() {
    return this.accountsService.listAccounts();
  }

  @Get(':id')
  getAccount(@Param('id') id: string) {
    return this.accountsService.getAccount(id);
  }

  @Post()
  createAccount(@Body() body: { name: string; parentAccountId?: number }) {
    return this.accountsService.createAccount(body);
  }
}
