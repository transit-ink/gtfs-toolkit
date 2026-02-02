import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Group } from './group.entity';
import { GroupService } from './group.service';

@ApiTags('Groups')
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get()
  @ApiOperation({ summary: 'Get all groups' })
  @ApiResponse({
    status: 200,
    description: 'Returns all groups',
    type: [Group],
  })
  findAll(): Promise<Group[]> {
    return this.groupService.findAll();
  }

  @Get('bulk')
  @ApiOperation({ summary: 'Get groups by multiple IDs' })
  @ApiQuery({
    name: 'ids',
    required: true,
    description: 'Comma-separated list of group IDs',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns groups matching the provided IDs',
    type: [Group],
  })
  findByIds(@Query('ids') ids: string): Promise<Group[]> {
    const groupIds = ids.split(',').map(id => id.trim()).filter(Boolean);
    return this.groupService.findByIds(groupIds);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a group by ID' })
  @ApiResponse({ status: 200, description: 'Returns the group', type: Group })
  @ApiResponse({ status: 404, description: 'Group not found' })
  findById(@Param('id') id: string): Promise<Group> {
    return this.groupService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({
    status: 201,
    description: 'The group has been successfully created.',
    type: Group,
  })
  create(@Body() group: Partial<Group>): Promise<Group> {
    return this.groupService.create(group);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a group' })
  @ApiResponse({
    status: 200,
    description: 'The group has been successfully updated.',
    type: Group,
  })
  update(@Param('id') id: string, @Body() group: Partial<Group>): Promise<Group> {
    return this.groupService.update(id, group);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a group' })
  @ApiResponse({
    status: 200,
    description: 'The group has been successfully deleted.',
  })
  delete(@Param('id') id: string): Promise<void> {
    return this.groupService.delete(id);
  }
}
