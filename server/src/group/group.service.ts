import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Group } from './group.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
  ) {}

  async findAll(): Promise<Group[]> {
    return this.groupRepository.find({
      order: { name: 'ASC' },
    });
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
