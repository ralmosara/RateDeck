import { Controller, Get, Param, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Query, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RatesService } from './rates.service';
import { JwtAuthGuard } from '../iam/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get('decks')
  async listDecks() {
    return this.ratesService.listDecks();
  }

  @Get('decks/:id')
  async getDeck(@Param('id') id: string) {
    return this.ratesService.getDeck(id);
  }

  @Get('decks/:id/versions')
  async getDeckVersions(@Param('id') id: string) {
    const deck = await this.ratesService.getDeck(id);
    return this.ratesService.getDeckVersions(deck.id);
  }

  @Get('versions/:versionId/diff')
  async getVersionDiff(@Param('versionId') versionId: string) {
    return this.ratesService.getVersionDiff(parseInt(versionId, 10));
  }

  @Post('versions/:versionId/publish')
  async publishDeckVersion(@Param('versionId') versionId: string) {
    return this.ratesService.publishDeckVersion(parseInt(versionId, 10));
  }

  @Post('decks/import')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  async importDeck(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.ratesService.importDeck(file.buffer);
  }

  @Get('quote/:destination')
  async getQuote(
    @Param('destination') destination: string, 
    @Query('deckVersionId') deckVersionId: string,
    @Request() req: any
  ) {
    if (deckVersionId) {
      return this.ratesService.getQuote(parseInt(deckVersionId, 10), destination);
    } else {
      // Find the active published deck for this account
      return this.ratesService.getActiveQuote(req.user.accountPath, destination);
    }
  }
}
