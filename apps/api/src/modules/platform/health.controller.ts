import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@ratedeck/contracts';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { RedisService } from '../../infrastructure/redis/redis.module';

const VERSION = process.env.npm_package_version ?? '0.1.0';

@ApiTags('platform')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  /** Liveness: process is up. Never touches dependencies (avoids restart storms). */
  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness: dependencies reachable. Used by k8s and the web status pill. */
  @Get()
  @ApiOkResponse({ description: 'Dependency health' })
  async ready(): Promise<HealthResponse> {
    const [database, redis] = await Promise.all([this.db.ping(), this.redis.ping()]);
    return {
      status: database && redis ? 'ok' : 'degraded',
      version: VERSION,
      uptimeSec: Math.round(process.uptime()),
      checks: { database: database ? 'up' : 'down', redis: redis ? 'up' : 'down' },
    };
  }
}
