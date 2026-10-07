import { Controller, Post, Get, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../iam/jwt-auth.guard';
import { CdrService } from './cdr.service';
import { createHash } from 'crypto';

@ApiTags('cdrs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/cdrs')
export class CdrController {
  constructor(private readonly cdrService: CdrService) {}

  @Post('import')
  @ApiOperation({ summary: 'Import CDRs via CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  async importCdrs(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    
    return this.cdrService.importFile(
      req.user.accountId,
      req.user.accountPath,
      file.buffer,
      checksum
    );
  }

  @Get()
  @ApiOperation({ summary: 'List CDRs with pagination and filters' })
  async listCdrs(
    @Request() req, 
    @Query('cursor') cursor?: string,
    @Query('limit') limit = 50,
    @Query('callee') callee?: string
  ) {
    return this.cdrService.listCdrs(
      req.user.accountPath, 
      Number(limit), 
      cursor,
      callee
    );
  }
}
