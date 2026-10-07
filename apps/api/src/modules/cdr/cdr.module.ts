import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { ConfigModule } from '../../config/config.module';
import { CdrController } from './cdr.controller';
import { CdrService } from './cdr.service';
import { CdrIngestProcessor } from './cdr-ingest.processor';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [CdrController],
  providers: [CdrService, CdrIngestProcessor],
  exports: [CdrService],
})
export class CdrModule {}
