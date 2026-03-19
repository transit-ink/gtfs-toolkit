import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  PaginatedResponse,
  PaginationParams,
} from '../common/interfaces/pagination.interface';
import { User } from '../auth/entities/user.entity';
import { Change, ChangeOperation, EntityType } from './entities/change.entity';
import { Changeset, ChangesetStatus } from './entities/changeset.entity';

export interface CreateChangesetDto {
  description?: string;
  related_route_id?: string;
  related_stop_id?: string;
}

export interface AddChangeDto {
  entity_type: EntityType;
  entity_id: string;
  operation: ChangeOperation;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  related_route_id?: string;
  related_stop_id?: string;
  related_trip_id?: string;
}

export interface SubmitChangesetDto {
  description: string;
}

export interface ReviewChangesetDto {
  comment?: string;
}

export interface ChangesetFilterParams extends PaginationParams {
  status?: ChangesetStatus;
  user_id?: string;
  entity_type?: EntityType;
  related_route_id?: string;
  related_stop_id?: string;
}

@Injectable()
export class ChangesetService {
  constructor(
    @InjectRepository(Changeset)
    private changesetRepository: Repository<Changeset>,
    @InjectRepository(Change)
    private changeRepository: Repository<Change>,
    private dataSource: DataSource,
  ) {}

  async findAll(
    params?: ChangesetFilterParams,
  ): Promise<PaginatedResponse<Changeset>> {
    const {
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      status,
      user_id,
      entity_type,
      related_route_id,
      related_stop_id,
    } = params || {};

    const queryBuilder = this.changesetRepository
      .createQueryBuilder('changeset')
      .leftJoinAndSelect('changeset.user', 'user')
      .leftJoinAndSelect('changeset.reviewer', 'reviewer')
      .leftJoinAndSelect('changeset.changes', 'changes');

    if (status) {
      queryBuilder.andWhere('changeset.status = :status', { status });
    }

    if (user_id) {
      queryBuilder.andWhere('changeset.user_id = :user_id', { user_id });
    }

    if (entity_type) {
      queryBuilder.andWhere('changes.entity_type = :entity_type', {
        entity_type,
      });
    }

    if (related_route_id) {
      queryBuilder.andWhere('changeset.related_route_id = :related_route_id', {
        related_route_id,
      });
    }

    if (related_stop_id) {
      queryBuilder.andWhere('changeset.related_stop_id = :related_stop_id', {
        related_stop_id,
      });
    }

    queryBuilder.orderBy(`changeset.${sortBy}`, sortOrder);
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<Changeset> {
    const changeset = await this.changesetRepository.findOne({
      where: { id },
      relations: ['user', 'reviewer', 'changes'],
    });

    if (!changeset) {
      throw new NotFoundException(`Changeset with ID ${id} not found`);
    }

    return changeset;
  }

  async findDraftByUser(userId: string): Promise<Changeset | null> {
    return this.changesetRepository.findOne({
      where: {
        user_id: userId,
        status: ChangesetStatus.DRAFT,
      },
      relations: ['changes'],
    });
  }

  async getOrCreateDraft(user: User): Promise<Changeset> {
    let draft = await this.findDraftByUser(user.id);

    if (!draft) {
      draft = this.changesetRepository.create({
        user_id: user.id,
        status: ChangesetStatus.DRAFT,
      });
      draft = await this.changesetRepository.save(draft);
      draft.changes = [];
    }

    return draft;
  }

  async create(user: User, dto: CreateChangesetDto): Promise<Changeset> {
    const changeset = this.changesetRepository.create({
      user_id: user.id,
      description: dto.description,
      related_route_id: dto.related_route_id || null,
      related_stop_id: dto.related_stop_id || null,
      status: ChangesetStatus.DRAFT,
    });

    return this.changesetRepository.save(changeset);
  }

  async update(
    id: string,
    user: User,
    dto: Partial<CreateChangesetDto>,
  ): Promise<Changeset> {
    const changeset = await this.findById(id);

    if (changeset.user_id !== user.id) {
      throw new ForbiddenException('You can only update your own changesets');
    }

    if (changeset.status !== ChangesetStatus.DRAFT) {
      throw new BadRequestException('Only draft changesets can be updated');
    }

    if (dto.description !== undefined) {
      changeset.description = dto.description;
    }

    return this.changesetRepository.save(changeset);
  }

  async delete(id: string, user: User): Promise<void> {
    const changeset = await this.findById(id);

    if (changeset.user_id !== user.id) {
      throw new ForbiddenException('You can only delete your own changesets');
    }

    if (changeset.status !== ChangesetStatus.DRAFT) {
      throw new BadRequestException('Only draft changesets can be deleted');
    }

    await this.changesetRepository.remove(changeset);
  }

  async addChange(
    changesetId: string,
    user: User,
    dto: AddChangeDto,
  ): Promise<Change> {
    const changeset = await this.findById(changesetId);

    if (changeset.user_id !== user.id) {
      throw new ForbiddenException(
        'You can only add changes to your own changesets',
      );
    }

    if (changeset.status !== ChangesetStatus.DRAFT) {
      throw new BadRequestException(
        'Changes can only be added to draft changesets',
      );
    }

    // Update changeset's related fields if not already set
    // This associates the changeset with the first route/stop that is edited
    let changesetUpdated = false;
    if (!changeset.related_route_id && dto.related_route_id) {
      changeset.related_route_id = dto.related_route_id;
      changesetUpdated = true;
    }
    if (!changeset.related_stop_id && dto.related_stop_id) {
      changeset.related_stop_id = dto.related_stop_id;
      changesetUpdated = true;
    }
    if (changesetUpdated) {
      await this.changesetRepository.save(changeset);
    }

    // Check if there's already a change for this entity in this changeset
    const existingChange = await this.changeRepository.findOne({
      where: {
        changeset_id: changesetId,
        entity_type: dto.entity_type,
        entity_id: dto.entity_id,
      },
    });

    if (existingChange) {
      // Update the existing change
      existingChange.operation = dto.operation;
      existingChange.new_data = dto.new_data || null;
      if (dto.old_data) {
        existingChange.old_data = dto.old_data;
      }
      existingChange.related_route_id = dto.related_route_id || null;
      existingChange.related_stop_id = dto.related_stop_id || null;
      existingChange.related_trip_id = dto.related_trip_id || null;
      return this.changeRepository.save(existingChange);
    }

    const change = this.changeRepository.create({
      changeset_id: changesetId,
      entity_type: dto.entity_type,
      entity_id: dto.entity_id,
      operation: dto.operation,
      old_data: dto.old_data || null,
      new_data: dto.new_data || null,
      related_route_id: dto.related_route_id || null,
      related_stop_id: dto.related_stop_id || null,
      related_trip_id: dto.related_trip_id || null,
    });

    return this.changeRepository.save(change);
  }

  async removeChange(changeId: string, user: User): Promise<void> {
    const change = await this.changeRepository.findOne({
      where: { id: changeId },
      relations: ['changeset'],
    });

    if (!change) {
      throw new NotFoundException(`Change with ID ${changeId} not found`);
    }

    if (change.changeset.user_id !== user.id) {
      throw new ForbiddenException(
        'You can only remove changes from your own changesets',
      );
    }

    if (change.changeset.status !== ChangesetStatus.DRAFT) {
      throw new BadRequestException(
        'Changes can only be removed from draft changesets',
      );
    }

    await this.changeRepository.remove(change);
  }

  async submit(id: string, user: User, dto: SubmitChangesetDto): Promise<Changeset> {
    const changeset = await this.findById(id);

    if (changeset.user_id !== user.id) {
      throw new ForbiddenException('You can only submit your own changesets');
    }

    if (changeset.status !== ChangesetStatus.DRAFT) {
      throw new BadRequestException('Only draft changesets can be submitted');
    }

    if (!changeset.changes || changeset.changes.length === 0) {
      throw new BadRequestException(
        'Cannot submit an empty changeset. Add some changes first.',
      );
    }

    if (!dto.description || dto.description.trim().length === 0) {
      throw new BadRequestException(
        'A description is required when submitting a changeset',
      );
    }

    changeset.description = dto.description.trim();
    changeset.status = ChangesetStatus.PENDING;

    return this.changesetRepository.save(changeset);
  }

  async approve(
    id: string,
    reviewer: User,
    dto: ReviewChangesetDto,
  ): Promise<Changeset> {
    const changeset = await this.findById(id);

    if (changeset.status !== ChangesetStatus.PENDING) {
      throw new BadRequestException('Only pending changesets can be approved');
    }

    // Apply all changes in a transaction
    await this.applyChanges(changeset);

    changeset.status = ChangesetStatus.APPROVED;
    changeset.reviewed_by = reviewer.id;
    changeset.reviewed_at = new Date();
    changeset.review_comment = dto.comment || null;

    return this.changesetRepository.save(changeset);
  }

  async reject(
    id: string,
    reviewer: User,
    dto: ReviewChangesetDto,
  ): Promise<Changeset> {
    const changeset = await this.findById(id);

    if (changeset.status !== ChangesetStatus.PENDING) {
      throw new BadRequestException('Only pending changesets can be rejected');
    }

    changeset.status = ChangesetStatus.REJECTED;
    changeset.reviewed_by = reviewer.id;
    changeset.reviewed_at = new Date();
    changeset.review_comment = dto.comment || null;

    return this.changesetRepository.save(changeset);
  }

  /**
   * Create a changeset with a single change and auto-approve it.
   * Used by moderators/admins to create an audit trail while applying changes immediately.
   */
  async createAndAutoApprove(
    user: User,
    description: string,
    changeDto: AddChangeDto,
  ): Promise<{ changeset: Changeset; change: Change }> {
    // Create the changeset with related route/stop from the change
    const changeset = this.changesetRepository.create({
      user_id: user.id,
      description,
      status: ChangesetStatus.APPROVED,
      reviewed_by: user.id, // Self-approved
      reviewed_at: new Date(),
      review_comment: 'Auto-approved (moderator/admin edit)',
      related_route_id: changeDto.related_route_id || null,
      related_stop_id: changeDto.related_stop_id || null,
    });

    const savedChangeset = await this.changesetRepository.save(changeset);

    // Create the change
    const change = this.changeRepository.create({
      changeset_id: savedChangeset.id,
      entity_type: changeDto.entity_type,
      entity_id: changeDto.entity_id,
      operation: changeDto.operation,
      old_data: changeDto.old_data || null,
      new_data: changeDto.new_data || null,
      related_route_id: changeDto.related_route_id || null,
      related_stop_id: changeDto.related_stop_id || null,
      related_trip_id: changeDto.related_trip_id || null,
    });

    const savedChange = await this.changeRepository.save(change);

    // Apply the change immediately
    savedChangeset.changes = [savedChange];
    await this.applyChanges(savedChangeset);

    return { changeset: savedChangeset, change: savedChange };
  }

  private async applyChanges(changeset: Changeset): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const change of changeset.changes) {
        await this.applyChange(queryRunner, change);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async applyChange(
    queryRunner: import('typeorm').QueryRunner,
    change: Change,
  ): Promise<void> {
    const tableName = this.getTableName(change.entity_type);
    const idColumn = this.getIdColumn(change.entity_type);

    switch (change.operation) {
      case ChangeOperation.CREATE:
        if (!change.new_data) {
          throw new BadRequestException(
            'new_data is required for create operations',
          );
        }
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(tableName)
          .values(change.new_data)
          .execute();
        break;

      case ChangeOperation.UPDATE:
        if (!change.new_data) {
          throw new BadRequestException(
            'new_data is required for update operations',
          );
        }
        await queryRunner.manager
          .createQueryBuilder()
          .update(tableName)
          .set(change.new_data)
          .where(`${idColumn} = :entityId`, { entityId: change.entity_id })
          .execute();
        break;

      case ChangeOperation.DELETE:
        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(tableName)
          .where(`${idColumn} = :entityId`, { entityId: change.entity_id })
          .execute();
        break;
    }
  }

  private getTableName(entityType: EntityType): string {
    const tableMap: Record<EntityType, string> = {
      [EntityType.AGENCY]: 'agency',
      [EntityType.STOP]: 'stops',
      [EntityType.ROUTE]: 'routes',
      [EntityType.TRIP]: 'trips',
      [EntityType.STOP_TIME]: 'stop_times',
      [EntityType.CALENDAR]: 'calendar',
      [EntityType.CALENDAR_DATE]: 'calendar_dates',
      [EntityType.SHAPE]: 'shapes',
    };
    return tableMap[entityType];
  }

  private getIdColumn(entityType: EntityType): string {
    const idColumnMap: Record<EntityType, string> = {
      [EntityType.AGENCY]: 'agency_id',
      [EntityType.STOP]: 'stop_id',
      [EntityType.ROUTE]: 'route_id',
      [EntityType.TRIP]: 'trip_id',
      [EntityType.STOP_TIME]: 'id', // stop_times use composite key, we'll need special handling
      [EntityType.CALENDAR]: 'service_id',
      [EntityType.CALENDAR_DATE]: 'id',
      [EntityType.SHAPE]: 'id',
    };
    return idColumnMap[entityType];
  }

  async getPendingChangesForEntity(
    entityType: EntityType,
    entityId: string,
    userId?: string,
  ): Promise<Change[]> {
    const queryBuilder = this.changeRepository
      .createQueryBuilder('change')
      .innerJoin('change.changeset', 'changeset')
      .where('change.entity_type = :entityType', { entityType })
      .andWhere('change.entity_id = :entityId', { entityId })
      .andWhere('changeset.status IN (:...statuses)', {
        statuses: [ChangesetStatus.DRAFT, ChangesetStatus.PENDING],
      });

    if (userId) {
      queryBuilder.andWhere('changeset.user_id = :userId', { userId });
    }

    return queryBuilder.getMany();
  }

  async getPendingChangesForUser(
    userId: string,
    entityType?: EntityType,
    entityIds?: string[],
  ): Promise<Change[]> {
    const queryBuilder = this.changeRepository
      .createQueryBuilder('change')
      .innerJoin('change.changeset', 'changeset')
      .where('changeset.user_id = :userId', { userId })
      .andWhere('changeset.status IN (:...statuses)', {
        statuses: [ChangesetStatus.DRAFT, ChangesetStatus.PENDING],
      });

    if (entityType) {
      queryBuilder.andWhere('change.entity_type = :entityType', { entityType });
    }

    if (entityIds && entityIds.length > 0) {
      queryBuilder.andWhere('change.entity_id IN (:...entityIds)', { entityIds });
    }

    return queryBuilder.getMany();
  }

  async getAllPendingChanges(
    entityType?: EntityType,
    relatedRouteId?: string,
  ): Promise<Change[]> {
    const queryBuilder = this.changeRepository
      .createQueryBuilder('change')
      .innerJoinAndSelect('change.changeset', 'changeset')
      .leftJoinAndSelect('changeset.user', 'user')
      .where('changeset.status = :status', { status: ChangesetStatus.PENDING });

    if (entityType) {
      queryBuilder.andWhere('change.entity_type = :entityType', { entityType });
    }

    if (relatedRouteId) {
      queryBuilder.andWhere('change.related_route_id = :relatedRouteId', {
        relatedRouteId,
      });
    }

    return queryBuilder.getMany();
  }

  /**
   * Get top contributors for a route based on approved changesets.
   * Returns users who have made changes to this route, ordered by change count.
   */
  async getRouteContributors(
    routeId: string,
    limit: number = 3,
  ): Promise<{ userId: string; username: string; changeCount: number }[]> {
    const result = await this.changeRepository
      .createQueryBuilder('change')
      .innerJoin('change.changeset', 'changeset')
      .innerJoin('changeset.user', 'user')
      .select('user.id', 'userId')
      .addSelect('user.username', 'username')
      .addSelect('COUNT(change.id)', 'changeCount')
      .where('changeset.status = :status', { status: ChangesetStatus.APPROVED })
      .andWhere(
        '(change.related_route_id = :routeId OR (change.entity_type = :routeType AND change.entity_id = :routeId))',
        { routeId, routeType: EntityType.ROUTE },
      )
      .groupBy('user.id')
      .addGroupBy('user.username')
      .orderBy('COUNT(change.id)', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((row) => ({
      userId: row.userId,
      username: row.username,
      changeCount: parseInt(row.changeCount, 10),
    }));
  }
}
