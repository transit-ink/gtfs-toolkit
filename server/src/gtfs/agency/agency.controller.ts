import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Agency } from './agency.entity';
import { AgencyService } from './agency.service';

@ApiTags('Agency')
@Controller('gtfs/agency')
export class AgencyController {
  constructor(private readonly agencyService: AgencyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all agencies' })
  @ApiResponse({
    status: 200,
    description: 'Returns all agencies',
    type: [Agency],
  })
  findAll(): Promise<Agency[]> {
    return this.agencyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agency by ID' })
  @ApiResponse({ status: 200, description: 'Returns the agency', type: Agency })
  @ApiResponse({ status: 404, description: 'Agency not found' })
  findById(@Param('id') id: string): Promise<Agency> {
    return this.agencyService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new agency' })
  @ApiResponse({
    status: 201,
    description: 'Agency created successfully',
    type: Agency,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() agency: Agency): Promise<Agency> {
    return this.agencyService.create(agency);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update agency by ID' })
  @ApiResponse({
    status: 200,
    description: 'Agency updated successfully',
    type: Agency,
  })
  @ApiResponse({ status: 404, description: 'Agency not found' })
  update(@Param('id') id: string, @Body() agency: Agency): Promise<Agency> {
    return this.agencyService.update(id, agency);
  }
}
