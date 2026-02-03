import {
  Body,
  Controller,
  Delete,
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
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PaginationParams } from '../../common/interfaces/pagination.interface';
import { Trip } from './trip.entity';
import { TripsService } from './trips.service';

@ApiTags('Trips')
@Controller('gtfs/trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all trips, optionally filtered' })
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
  @ApiQuery({
    name: 'ids',
    required: false,
    description: 'Optional comma-separated list of trip IDs to fetch in bulk',
  })
  @ApiQuery({
    name: 'routeId',
    required: false,
    description: 'Filter trips by route ID',
  })
  @ApiQuery({
    name: 'routeIds',
    required: false,
    description: 'Filter trips by multiple route IDs (comma-separated)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated trips or all trips matching the provided IDs',
    type: [Trip],
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('routeId') routeId?: string,
    @Query('routeIds') routeIds?: string,
    @Query('ids') ids?: string,
  ) {
    if (ids) {
      const tripIds = ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      return this.tripsService.findBulk(tripIds);
    }

    const params: PaginationParams = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
      routeId,
      routeIds: routeIds ? routeIds.split(',').filter(Boolean) : undefined,
    };
    return this.tripsService.findAll(params);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new trip' })
  @ApiResponse({
    status: 201,
    description: 'The trip has been successfully created.',
    type: Trip,
  })
  create(@Body() trip: Trip): Promise<Trip> {
    return this.tripsService.create(trip);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate a trip with incremented stop times' })
  @ApiBody({
    description: 'New trip ID and optional time increment in minutes',
    schema: {
      type: 'object',
      properties: {
        newTripId: {
          type: 'string',
          description: 'ID for the new trip',
        },
        timeIncrementMinutes: {
          type: 'number',
          description: 'Minutes to add to all stop times (default: 5)',
          default: 5,
        },
      },
      required: ['newTripId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The trip has been successfully duplicated.',
  })
  duplicate(
    @Param('id') id: string,
    @Body() body: { newTripId: string; timeIncrementMinutes?: number },
  ) {
    return this.tripsService.duplicateTrip(
      id,
      body.newTripId,
      body.timeIncrementMinutes || 5,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trip by ID' })
  @ApiResponse({ status: 200, description: 'Returns the trip', type: Trip })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  findById(@Param('id') id: string): Promise<Trip> {
    return this.tripsService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a trip' })
  @ApiResponse({
    status: 200,
    description: 'The trip has been successfully updated.',
    type: Trip,
  })
  update(@Param('id') id: string, @Body() trip: Trip): Promise<Trip> {
    return this.tripsService.update(id, trip);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a trip' })
  @ApiResponse({
    status: 200,
    description: 'The trip has been successfully deleted.',
  })
  delete(@Param('id') id: string): Promise<void> {
    return this.tripsService.delete(id);
  }
}
