import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Get all shapes' })
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
  @ApiResponse({
    status: 200,
    description: 'Returns paginated shapes',
    type: [Shape],
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const params: PaginationParams = {
      page,
      limit,
      sortBy,
      sortOrder,
    };
    return this.shapesService.findAll(params);
  }

  @Get('bulk')
  @ApiOperation({ summary: 'Get shapes by multiple IDs' })
  @ApiQuery({
    name: 'ids',
    required: true,
    description: 'Comma-separated list of shape IDs',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns shapes matching the provided IDs',
    type: [Shape],
  })
  async findByIds(@Query('ids') ids: string): Promise<Shape[]> {
    const shapeIds = ids.split(',');
    console.log(shapeIds);
    return await this.shapesService.findByIds(shapeIds);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shapes by ID' })
  @ApiResponse({ status: 200, description: 'Return the shapes' })
  findById(@Param('id') id: string): Promise<Shape[]> {
    return this.shapesService.findById(id);
  }

  @Post('update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update shape points for a shape ID' })
  @ApiBody({
    description: 'Shape ID and new points',
    schema: {
      type: 'object',
      properties: {
        shapeId: {
          type: 'string',
          description: 'The shape ID to update',
        },
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
  updateShape(@Body() dto: UpdateShapeDto): Promise<{ updated: number }> {
    return this.shapesService.updateShape(dto);
  }
}
