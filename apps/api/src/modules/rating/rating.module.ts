import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { ConfigModule } from '../../config/config.module';
import { RatesModule } from '../rates/rates.module';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { RatingProcessor } from './rating.processor';

@Module({
  imports: [DatabaseModule, ConfigModule, RatesModule],
  controllers: [RatingController],
  providers: [RatingService, RatingProcessor],
  exports: [RatingService],
})
export class RatingModule {}
