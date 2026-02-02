import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { GtfsExportService } from './utils/gtfs-export.service';

@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly gtfsExportService: GtfsExportService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  root(): { status: string } {
    return { status: 'ok' };
  }

  @Get('health-check')
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 2000 }),
    ]);
  }

  @Get('gtfs-export-link')
  @ApiOperation({
    summary: 'Get public download link for latest GTFS export (this instance)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Public URL and metadata for this instance’s most recent EOD export.',
  })
  @ApiResponse({ status: 404, description: 'No GTFS export found in S3' })
  async getGtfsExportLink(): Promise<string> {
    const result = await this.gtfsExportService.getLatestExportDownloadUrl();
    if (!result) {
      throw new NotFoundException('No GTFS export found');
    }
    return result;
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  getRobots(): string {
    return 'User-agent: *\nDisallow: /';
  }

  @Get('favicon.ico')
  @HttpCode(HttpStatus.NO_CONTENT)
  getFavicon(): void {}
}
