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
import { Stop } from './stop.entity';
import { StopsService } from './stops.service';

@ApiTags('Stops')
@Controller('gtfs/stops')
export class StopsController {
  constructor(private readonly stopsService: StopsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all stops, optionally filtered' })
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
    description: 'Field to sort by (default: stop_id)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (ASC or DESC, default: ASC)',
  })
  @ApiQuery({
    name: 'ids',
    required: false,
    description: 'Optional comma-separated list of stop IDs to fetch in bulk',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated stops, or all stops matching the provided IDs',
    type: [Stop],
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('ids') ids?: string,
  ) {
    if (ids) {
      const stopIds = ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      return this.stopsService.findByIds(stopIds);
    }

    // Bulk fetch by IDs is now supported via the same endpoint using the ids query parameter.
    const params: PaginationParams = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    };
    return this.stopsService.findAll(params);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new stop' })
  @ApiResponse({
    status: 201,
    description: 'The stop has been successfully created.',
    type: Stop,
  })
  create(@Body() stop: Partial<Stop>): Promise<Stop> {
    return this.stopsService.create(stop);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find stops near a location' })
  @ApiQuery({ name: 'lat', required: true, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: true, description: 'Longitude' })
  @ApiQuery({
    name: 'radius',
    required: true,
    description: 'Search radius in meters',
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
    description: 'Field to sort by (default: stop_id)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (ASC or DESC, default: ASC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated nearby stops',
    type: [Stop],
  })
  findByLatLon(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('radius') radius: string,
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
    return this.stopsService.findByLatLon(
      parseFloat(lat),
      parseFloat(lon),
      parseFloat(radius),
      params,
    );
  }

  @Get('bounds')
  @ApiOperation({ summary: 'Get stops within geographic bounds' })
  @ApiQuery({
    name: 'minLat',
    required: true,
    description: 'Minimum latitude',
    type: Number,
  })
  @ApiQuery({
    name: 'maxLat',
    required: true,
    description: 'Maximum latitude',
    type: Number,
  })
  @ApiQuery({
    name: 'minLon',
    required: true,
    description: 'Minimum longitude',
    type: Number,
  })
  @ApiQuery({
    name: 'maxLon',
    required: true,
    description: 'Maximum longitude',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of stops to return (default: 100)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns stops within the specified bounds (excludes child stops)',
    type: [Stop],
  })
  findInBounds(
    @Query('minLat') minLat: string,
    @Query('maxLat') maxLat: string,
    @Query('minLon') minLon: string,
    @Query('maxLon') maxLon: string,
    @Query('limit') limit?: string,
  ): Promise<Stop[]> {
    return this.stopsService.findInBounds(
      parseFloat(minLat),
      parseFloat(maxLat),
      parseFloat(minLon),
      parseFloat(maxLon),
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('bounds/all')
  @ApiOperation({ summary: 'Get all stops within geographic bounds (including child stops)' })
  @ApiQuery({
    name: 'minLat',
    required: true,
    description: 'Minimum latitude',
    type: Number,
  })
  @ApiQuery({
    name: 'maxLat',
    required: true,
    description: 'Maximum latitude',
    type: Number,
  })
  @ApiQuery({
    name: 'minLon',
    required: true,
    description: 'Minimum longitude',
    type: Number,
  })
  @ApiQuery({
    name: 'maxLon',
    required: true,
    description: 'Maximum longitude',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of stops to return (default: 200)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all stops within the specified bounds (including child stops)',
    type: [Stop],
  })
  findAllInBounds(
    @Query('minLat') minLat: string,
    @Query('maxLat') maxLat: string,
    @Query('minLon') minLon: string,
    @Query('maxLon') maxLon: string,
    @Query('limit') limit?: string,
  ): Promise<Stop[]> {
    return this.stopsService.findAllInBounds(
      parseFloat(minLat),
      parseFloat(maxLat),
      parseFloat(minLon),
      parseFloat(maxLon),
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('group/:id')
  @ApiOperation({
    summary: 'Get stops by ID or parent station',
    description:
      'Returns all stops where stop_id matches the given ID, or where parent_station matches the given ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the stop group',
    type: [Stop],
  })
  findByIdOrParentStation(@Param('id') id: string): Promise<Stop[]> {
    return this.stopsService.findByIdOrParentStation(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stop by ID' })
  @ApiResponse({ status: 200, description: 'Returns the stop', type: Stop })
  @ApiResponse({ status: 404, description: 'Stop not found' })
  findById(@Param('id') id: string): Promise<Stop> {
    return this.stopsService.findById(id);
  }

  @Get(':id/trips')
  @ApiOperation({ summary: 'Get trips that include this stop' })
  @ApiResponse({
    status: 200,
    description: 'Returns trips that have this stop in their stop_times',
  })
  getTripsForStop(@Param('id') id: string) {
    return this.stopsService.getTripsForStop(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a stop' })
  @ApiResponse({
    status: 200,
    description: 'The stop has been successfully updated.',
    type: Stop,
  })
  update(@Param('id') id: string, @Body() stop: Partial<Stop>): Promise<Stop> {
    return this.stopsService.update(id, stop);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a stop' })
  @ApiResponse({
    status: 200,
    description: 'The stop has been successfully deleted. If it was a parent station, child stops will have their parent_station reference removed.',
  })
  @ApiResponse({ status: 404, description: 'Stop not found' })
  delete(@Param('id') id: string): Promise<void> {
    return this.stopsService.delete(id);
  }
}
