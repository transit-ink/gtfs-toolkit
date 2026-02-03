import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../auth/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Change } from './entities/change.entity';
import { Changeset, ChangesetStatus } from './entities/changeset.entity';
import {
  AddChangeDto,
  ChangesetService,
  CreateChangesetDto,
  ReviewChangesetDto,
  SubmitChangesetDto,
} from './changeset.service';
import { EntityType } from './entities/change.entity';

@ApiTags('Changesets')
@Controller('changesets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChangesetController {
  constructor(private readonly changesetService: ChangesetService) {}

  @Get()
  @ApiOperation({ summary: 'List changesets' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ChangesetStatus })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({ name: 'entity_type', required: false, enum: EntityType })
  @ApiResponse({ status: 200, description: 'List of changesets' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ChangesetStatus,
    @Query('user_id') user_id?: string,
    @Query('entity_type') entity_type?: EntityType,
  ) {
    return this.changesetService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      user_id,
      entity_type,
    });
  }

  @Get('draft')
  @ApiOperation({
    summary: 'Get or create the current user\'s draft changeset',
  })
  @ApiResponse({ status: 200, description: 'The draft changeset', type: Changeset })
  async getOrCreateDraft(@CurrentUser() user: User): Promise<Changeset> {
    return this.changesetService.getOrCreateDraft(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a changeset by ID' })
  @ApiResponse({ status: 200, description: 'The changeset', type: Changeset })
  @ApiResponse({ status: 404, description: 'Changeset not found' })
  async findById(@Param('id') id: string): Promise<Changeset> {
    return this.changesetService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new changeset' })
  @ApiResponse({ status: 201, description: 'The created changeset', type: Changeset })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateChangesetDto,
  ): Promise<Changeset> {
    return this.changesetService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a changeset (draft only)' })
  @ApiResponse({ status: 200, description: 'The updated changeset', type: Changeset })
  @ApiResponse({ status: 403, description: 'Not the owner of this changeset' })
  @ApiResponse({ status: 400, description: 'Changeset is not a draft' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: Partial<CreateChangesetDto>,
  ): Promise<Changeset> {
    return this.changesetService.update(id, user, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a changeset (draft only)' })
  @ApiResponse({ status: 200, description: 'Changeset deleted' })
  @ApiResponse({ status: 403, description: 'Not the owner of this changeset' })
  @ApiResponse({ status: 400, description: 'Changeset is not a draft' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.changesetService.delete(id, user);
  }

  @Post(':id/changes')
  @ApiOperation({ summary: 'Add a change to a changeset' })
  @ApiResponse({ status: 201, description: 'The created change', type: Change })
  @ApiResponse({ status: 403, description: 'Not the owner of this changeset' })
  @ApiResponse({ status: 400, description: 'Changeset is not a draft' })
  async addChange(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: AddChangeDto,
  ): Promise<Change> {
    return this.changesetService.addChange(id, user, dto);
  }

  @Delete('changes/:changeId')
  @ApiOperation({ summary: 'Remove a change from a changeset' })
  @ApiResponse({ status: 200, description: 'Change removed' })
  @ApiResponse({ status: 403, description: 'Not the owner of this changeset' })
  @ApiResponse({ status: 400, description: 'Changeset is not a draft' })
  async removeChange(
    @Param('changeId') changeId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.changesetService.removeChange(changeId, user);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a changeset for review' })
  @ApiResponse({ status: 200, description: 'The submitted changeset', type: Changeset })
  @ApiResponse({ status: 403, description: 'Not the owner of this changeset' })
  @ApiResponse({ status: 400, description: 'Changeset is not a draft or is empty' })
  async submit(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: SubmitChangesetDto,
  ): Promise<Changeset> {
    return this.changesetService.submit(id, user, dto);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a changeset (Moderator/Admin only)' })
  @ApiResponse({ status: 200, description: 'The approved changeset', type: Changeset })
  @ApiResponse({ status: 400, description: 'Changeset is not pending' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: ReviewChangesetDto,
  ): Promise<Changeset> {
    return this.changesetService.approve(id, user, dto);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject a changeset (Moderator/Admin only)' })
  @ApiResponse({ status: 200, description: 'The rejected changeset', type: Changeset })
  @ApiResponse({ status: 400, description: 'Changeset is not pending' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: ReviewChangesetDto,
  ): Promise<Changeset> {
    return this.changesetService.reject(id, user, dto);
  }

  @Get('pending/by-entity')
  @ApiOperation({
    summary: 'Get pending changes for specific entities',
    description: 'Returns pending changes (from user\'s draft/pending changesets) for the given entity type and IDs',
  })
  @ApiQuery({ name: 'entity_type', required: true, enum: EntityType })
  @ApiQuery({ name: 'entity_ids', required: false, type: String, description: 'Comma-separated entity IDs' })
  @ApiResponse({ status: 200, description: 'List of pending changes' })
  async getPendingChangesForEntities(
    @CurrentUser() user: User,
    @Query('entity_type') entity_type: EntityType,
    @Query('entity_ids') entity_ids?: string,
  ): Promise<Change[]> {
    const ids = entity_ids?.split(',').map(id => id.trim()).filter(Boolean);
    return this.changesetService.getPendingChangesForUser(user.id, entity_type, ids);
  }
}
