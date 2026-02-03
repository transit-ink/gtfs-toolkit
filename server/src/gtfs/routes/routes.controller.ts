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
import { Route } from './route.entity';
import { RoutesService } from './routes.service';

@ApiTags('Routes')
@Controller('gtfs/routes')
export class RoutesController {
  constructor(
    private readonly routesService: RoutesService,
    private readonly changesetHelper: ChangesetHelperService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all routes, optionally filtered' })
  @ApiQuery({
    name: 'agencyId',
    required: false,
    description: 'Optional filter by agency ID',
  })
  @ApiQuery({
    name: 'ids',
    required: false,
    description: 'Optional comma-separated list of route IDs to fetch in bulk',
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
    description: 'Field to sort by (default: route_id)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (ASC or DESC, default: ASC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated routes, or all routes matching the provided IDs',
    type: [Route],
  })
  findAll(
    @Query('agencyId') agencyId?: string,
    @Query('ids') ids?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    if (ids) {
      const routeIds = ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      return this.routesService.findBulk(routeIds);
    }

    const params: PaginationParams = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    };
    return this.routesService.findAll(agencyId, params);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search routes by short name' })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query for route short name',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns matching routes with similarity scores',
  })
  search(@Query('q') query: string) {
    return this.routesService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a route by ID' })
  @ApiResponse({ status: 200, description: 'Returns the route', type: Route })
  findOne(@Param('id') id: string): Promise<Route> {
    return this.routesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONTRIBUTOR, UserRole.MODERATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new route' })
  @ApiResponse({
    status: 201,
    description: 'The route has been successfully created (or added to changeset for contributors).',
    type: Route,
  })
  async create(
    @CurrentUser() user: User,
    @Body() route: Route,
  ): Promise<Route | { changeset: true; applied: boolean; message: string }> {
    const result = await this.changesetHelper.handleCreate(
      user,
      EntityType.ROUTE,
      route.route_id || '',
      route as unknown as Record<string, unknown>,
    );

    if (result.applied) {
      // Moderator/admin - change was auto-approved and applied
      return route;
    }

    // Contributor - change added to draft changeset
    return { changeset: true, applied: false, message: 'Route creation added to your draft changeset' };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONTRIBUTOR, UserRole.MODERATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a route' })
  @ApiResponse({
    status: 200,
    description: 'The route has been successfully updated (or added to changeset for contributors).',
    type: Route,
  })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() route: Partial<Route>,
  ): Promise<Route | { changeset: true; applied: boolean; message: string }> {
    const existingRoute = await this.routesService.findOne(id);

    const result = await this.changesetHelper.handleUpdate(
      user,
      EntityType.ROUTE,
      id,
      existingRoute as unknown as Record<string, unknown>,
      { ...existingRoute, ...route } as unknown as Record<string, unknown>,
      { related_route_id: id },
    );

    if (result.applied) {
      // Moderator/admin - change was auto-approved and applied
      return { ...existingRoute, ...route } as Route;
    }

    // Contributor - change added to draft changeset
    return { changeset: true, applied: false, message: 'Route update added to your draft changeset' };
  }
}
