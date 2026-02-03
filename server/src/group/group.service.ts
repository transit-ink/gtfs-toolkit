import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  PaginatedResponse,
  PaginationParams,
} from '../common/interfaces/pagination.interface';
import { Group } from './group.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
  ) {}

  async findAll(
    params?: PaginationParams,
  ): Promise<PaginatedResponse<Group>> {
    const {
      page = 1,
      limit = 100,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = params || {};

    const queryBuilder = this.groupRepository.createQueryBuilder('group');

    queryBuilder.orderBy(`group.${sortBy}`, sortOrder);
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

  async findById(groupId: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { group_id: groupId },
    });
    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }
    return group;
  }

  async findByIds(groupIds: string[]): Promise<Group[]> {
    if (!groupIds.length) {
      return [];
    }

    return this.groupRepository.find({
      where: { group_id: In(groupIds) },
    });
  }

  async create(group: Partial<Group>): Promise<Group> {
    const newGroup = this.groupRepository.create(group);
    return this.groupRepository.save(newGroup);
  }

  async update(groupId: string, group: Partial<Group>): Promise<Group> {
    const existingGroup = await this.findById(groupId);
    const updatedGroup = this.groupRepository.merge(existingGroup, group);
    return this.groupRepository.save(updatedGroup);
  }

  async delete(groupId: string): Promise<void> {
    const group = await this.findById(groupId);
    await this.groupRepository.remove(group);
  }
}
