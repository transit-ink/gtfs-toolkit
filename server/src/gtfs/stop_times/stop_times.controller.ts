import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User, UserRole } from '../../auth/entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ChangesetHelperService } from '../../changeset/changeset-helper.service';
import { EntityType } from '../../changeset/entities/change.entity';
import { PaginationParams } from '../../common/interfaces/pagination.interface';
import { StopTime } from './stop-time.entity';
import { AddStopToTripsDto, BulkUpdateStopTimesDto, RemoveStopFromTripsDto, ReorderStopTimesDto, StopTimesService } from './stop_times.service';

@ApiTags('Stop Times')
@Controller('gtfs/stop_times')
export class StopTimesController {
  constructor(
    private readonly stopTimesService: StopTimesService,
    private readonly changesetHelper: ChangesetHelperService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all stop times' })
  @ApiQuery({
    name: 'tripId',
    required: false,
    description:
      'Filter stop times by trip ID. Multiple trip IDs can be provided as a comma-separated list.',
  })
  @ApiQuery({
    name: 'stopId',
    required: false,
    description:
      'Filter stop times by stop ID. Multiple stop IDs can be provided as a comma-separated list.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page (default: 10)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort by (default: trip_id)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (ASC or DESC, default: ASC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated stop times',
    type: [StopTime],
  })
  findAll(
    @Query('tripId') tripId?: string,
    @Query('stopId') stopId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const params: PaginationParams = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    };
    return this.stopTimesService.findAll({
      tripIds: tripId ? tripId.split(',') : undefined,
      stopIds: stopId ? stopId.split(',') : undefined,
      params,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stop time by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the stop time',
    type: StopTime,
  })
  findOne(@Param('id') id: string): Promise<StopTime> {
    return this.stopTimesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONTRIBUTOR, UserRole.MODERATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new stop time' })
  @ApiResponse({
    status: 201,
    description: 'The stop time has been successfully created (or added to changeset for contributors).',
    type: StopTime,
  })
  async create(
    @CurrentUser() user: User,
    @Body() stopTime: StopTime,
  ): Promise<StopTime | { changeset: true; applied: boolean; message: string }> {
    const result = await this.changesetHelper.handleCreate(
      user,
      EntityType.STOP_TIME,
      `${stopTime.trip_id}_${stopTime.stop_id}_${stopTime.stop_sequence}`,
      stopTime as unknown as Record<string, unknown>,
      {
        related_trip_id: stopTime.trip_id,
        related_stop_id: stopTime.stop_id,
      },
    );

    if (result.applied) {
      // Moderator/admin - change was auto-approved and applied
      return stopTime;
    }

    // Contributor - change added to draft changeset
    return { changeset: true, applied: false, message: 'Stop time creation added to your draft changeset' };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONTRIBUTOR, UserRole.MODERATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a stop time' })
  @ApiResponse({
    status: 200,
    description: 'The stop time has been successfully updated (or added to changeset for contributors).',
    type: StopTime,
  })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() stopTime: StopTime,
  ): Promise<StopTime | { changeset: true; applied: boolean; message: string }> {
    const existingStopTime = await this.stopTimesService.findOne(id);

    const result = await this.changesetHelper.handleUpdate(
      user,
      EntityType.STOP_TIME,
      id,
      existingStopTime as unknown as Record<string, unknown>,
      { ...existingStopTime, ...stopTime } as unknown as Record<string, unknown>,
      {
        related_trip_id: existingStopTime.trip_id,
        related_stop_id: existingStopTime.stop_id,
      },
    );

    if (result.applied) {
      // Moderator/admin - change was auto-approved and applied
      return { ...existingStopTime, ...stopTime } as StopTime;
    }

    // Contributor - change added to draft changeset
    return { changeset: true, applied: false, message: 'Stop time update added to your draft changeset' };
  }

  @Post('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder stop times for multiple trips (Moderator/Admin only)' })
  @ApiBody({
    description: 'Trip IDs and new stop sequence order',
    schema: {
      type: 'object',
      properties: {
        tripIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of trip IDs to update',
        },
        stopSequence: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              stopId: { type: 'string' },
              sequence: { type: 'number' },
            },
          },
          description: 'New stop sequence order',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Stop times have been successfully reordered.',
  })
  reorder(@Body() dto: ReorderStopTimesDto): Promise<{ updated: number }> {
    return this.stopTimesService.reorderStopTimes(dto);
  }

  @Post('add-stop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a stop to multiple trips (Moderator/Admin only)' })
  @ApiBody({
    description: 'Trip IDs and stop to add',
    schema: {
      type: 'object',
      properties: {
        tripIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of trip IDs to add the stop to',
        },
        stopId: {
          type: 'string',
          description: 'ID of the stop to add',
        },
        arrivalTime: {
          type: 'string',
          description: 'Arrival time (e.g., "12:00:00")',
        },
        departureTime: {
          type: 'string',
          description: 'Departure time (e.g., "12:00:00")',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Stop has been added to the trips.',
  })
  addStop(@Body() dto: AddStopToTripsDto): Promise<{ added: number }> {
    return this.stopTimesService.addStopToTrips(dto);
  }

  @Post('remove-stop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a stop from multiple trips (Moderator/Admin only)' })
  @ApiBody({
    description: 'Trip IDs and stop to remove',
    schema: {
      type: 'object',
      properties: {
        tripIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of trip IDs to remove the stop from',
        },
        stopId: {
          type: 'string',
          description: 'ID of the stop to remove',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Stop has been removed from the trips.',
  })
  removeStop(@Body() dto: RemoveStopFromTripsDto): Promise<{ removed: number }> {
    return this.stopTimesService.removeStopFromTrips(dto);
  }

  @Post('bulk-update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONTRIBUTOR, UserRole.MODERATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update stop times' })
  @ApiBody({
    description: 'Array of stop time updates',
    schema: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tripId: { type: 'string' },
              stopId: { type: 'string' },
              arrivalTime: { type: 'string' },
              departureTime: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Stop times have been successfully updated (or added to changeset for contributors).',
  })
  async bulkUpdate(
    @CurrentUser() user: User,
    @Body() dto: BulkUpdateStopTimesDto,
  ): Promise<{ updated: number } | { changeset: true; applied: boolean; message: string; count: number }> {
    const { updates } = dto;

    if (updates.length === 0) {
      return { updated: 0 };
    }

    // For contributors: add each update to their changeset
    // For moderators/admins: create auto-approved changeset and apply
    const canSelfApprove = this.changesetHelper.canSelfApprove(user);

    if (canSelfApprove) {
      // Moderator/admin: apply directly with auto-approved changeset per update
      // Use the service directly for efficiency, but we still have audit trail from individual updates
      return this.stopTimesService.bulkUpdateStopTimes(dto);
    }

    // Contributor: add each update to their draft changeset
    let addedCount = 0;
    for (const update of updates) {
      // Get existing stop time
      const existingStopTime = await this.stopTimesService.findByTripAndStop(
        update.tripId,
        update.stopId,
      );

      if (existingStopTime) {
        const newData = {
          ...existingStopTime,
          arrival_time: update.arrivalTime ?? existingStopTime.arrival_time,
          departure_time: update.departureTime ?? existingStopTime.departure_time,
        };

        await this.changesetHelper.handleUpdate(
          user,
          EntityType.STOP_TIME,
          String(existingStopTime.id),
          existingStopTime as unknown as Record<string, unknown>,
          newData as unknown as Record<string, unknown>,
          {
            related_trip_id: update.tripId,
            related_stop_id: update.stopId,
          },
        );
        addedCount++;
      }
    }

    return {
      changeset: true,
      applied: false,
      message: `${addedCount} stop time update(s) added to your draft changeset`,
      count: addedCount,
    };
  }
}
