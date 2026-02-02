import { Controller, Get, Logger, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GtfsExportService } from '../utils/gtfs-export.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly gtfsExportService: GtfsExportService) {}

  @Get('export-gtfs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Export GTFS as ZIP (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'ZIP file containing GTFS CSV tables',
  })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
  async exportGtfs(
    @Res() res: FastifyReply,
    @Query('limit') limit?: string,
  ): Promise<void> {
    this.logger.log('Admin export-gtfs: request received');
    try {
      const filename = `gtfs-export-${process.env.INSTANCE_ID}-${+new Date()}.zip`;

      const parsedLimit = limit ? Number(limit) : undefined;
      const exportLimit =
        typeof parsedLimit === 'number' &&
        Number.isFinite(parsedLimit) &&
        parsedLimit > 0
          ? Math.floor(parsedLimit)
          : undefined;

      this.logger.log(
        `Admin export-gtfs: streaming ZIP "${filename}" (${exportLimit ? `limit ${exportLimit}` : 'full tables'})`,
      );

      res.status(200);
      res.header('Content-Type', 'application/zip');
      res.header(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      await this.gtfsExportService.streamGtfsZip(res.raw, {
        limit: exportLimit,
      });
    } catch (error) {
      this.logger.error(
        'Admin export-gtfs: failed',
        (error as Error)?.message ?? error,
        (error as Error)?.stack,
      );
      // If we haven't started sending the response body yet, return a JSON error.
      if (!res.sent) {
        res.status(500).send({ message: 'GTFS export failed' });
        return;
      }
      throw error;
    }
  }
}
