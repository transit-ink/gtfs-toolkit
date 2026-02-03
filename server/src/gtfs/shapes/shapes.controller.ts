import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
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
import { Shape } from './shape.entity';
import { ShapesService, UpdateShapeDto } from './shapes.service';

@ApiTags('Shapes')
@Controller('gtfs/shapes')
export class ShapesController {
  constructor(private readonly shapesService: ShapesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all shapes, optionally filtered' })
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
    description: 'Field to sort by (default: shape_id)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (ASC or DESC, default: ASC)',
  })
  @ApiQuery({
    name: 'ids',
    required: false,
    description: 'Optional comma-separated list of shape IDs to fetch in bulk',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated shapes, or all shapes matching the provided IDs',
    type: [Shape],
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('ids') ids?: string,
  ) {
    if (ids) {
      const shapeIds = ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      return this.shapesService.findByIds(shapeIds);
    }

    const params: PaginationParams = {
      page,
      limit,
      sortBy,
      sortOrder,
    };
    return this.shapesService.findAll(params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shapes by ID' })
  @ApiResponse({ status: 200, description: 'Return the shapes' })
  findById(@Param('id') id: string): Promise<Shape[]> {
    return this.shapesService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace shape points for a shape ID' })
  @ApiBody({
    description: 'New points for this shape',
    schema: {
      type: 'object',
      properties: {
        points: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lon: { type: 'number' },
              sequence: { type: 'number' },
              distTraveled: { type: 'number', nullable: true },
            },
          },
          description: 'Array of shape points with coordinates and sequence',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Shape has been successfully updated.',
  })
  updateShape(
    @Param('id') id: string,
    @Body()
    body: {
      points: {
        lat: number;
        lon: number;
        sequence: number;
        distTraveled?: number;
      }[];
    },
  ): Promise<{ updated: number }> {
    const dto: UpdateShapeDto = {
      shapeId: id,
      points: body.points,
    };
    return this.shapesService.updateShape(dto);
  }
}
