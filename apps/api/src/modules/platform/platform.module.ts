import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/** Platform module: health, settings, feature flags, FX (grows in later phases). */
@Module({ controllers: [HealthController] })
export class PlatformModule {}
