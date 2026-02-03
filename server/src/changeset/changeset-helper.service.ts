import { Injectable } from '@nestjs/common';
import { User, UserRole } from '../auth/entities/user.entity';
import { ChangesetService, AddChangeDto } from './changeset.service';
import { ChangeOperation, EntityType } from './entities/change.entity';

/**
 * Helper service to integrate changeset workflow with GTFS CRUD operations.
 * 
 * All edits create changesets for audit purposes:
 * - Contributors: Changes go to draft changeset, need to submit for review
 * - Moderators/Admins: Changes are auto-approved (self-approved) and applied immediately
 */
@Injectable()
export class ChangesetHelperService {
  constructor(private readonly changesetService: ChangesetService) {}

  /**
   * Check if user can self-approve (moderator or admin)
   */
  canSelfApprove(user: User): boolean {
    return (
      user.roles?.includes(UserRole.MODERATOR) ||
      user.roles?.includes(UserRole.ADMIN)
    );
  }

  /**
   * Create a change for a CREATE operation.
   * For contributors: adds to draft changeset
   * For moderators/admins: creates auto-approved changeset and applies the change
   */
  async handleCreate<T extends Record<string, unknown>>(
    user: User,
    entityType: EntityType,
    entityId: string,
    newData: T,
    context?: {
      related_route_id?: string;
      related_stop_id?: string;
      related_trip_id?: string;
    },
  ): Promise<{ useChangeset: true; change: unknown; applied: boolean }> {
    const changeDto: AddChangeDto = {
      entity_type: entityType,
      entity_id: entityId,
      operation: ChangeOperation.CREATE,
      new_data: newData as Record<string, unknown>,
      related_route_id: context?.related_route_id,
      related_stop_id: context?.related_stop_id,
      related_trip_id: context?.related_trip_id,
    };

    if (this.canSelfApprove(user)) {
      // Moderators/admins: create and auto-approve
      const result = await this.changesetService.createAndAutoApprove(
        user,
        `${ChangeOperation.CREATE} ${entityType}: ${entityId}`,
        changeDto,
      );
      return { useChangeset: true, change: result.change, applied: true };
    }

    // Contributors: add to draft
    const draft = await this.changesetService.getOrCreateDraft(user);
    const change = await this.changesetService.addChange(draft.id, user, changeDto);
    return { useChangeset: true, change, applied: false };
  }

  /**
   * Create a change for an UPDATE operation.
   * For contributors: adds to draft changeset
   * For moderators/admins: creates auto-approved changeset and applies the change
   */
  async handleUpdate<T extends Record<string, unknown>>(
    user: User,
    entityType: EntityType,
    entityId: string,
    oldData: T,
    newData: T,
    context?: {
      related_route_id?: string;
      related_stop_id?: string;
      related_trip_id?: string;
    },
  ): Promise<{ useChangeset: true; change: unknown; applied: boolean }> {
    const changeDto: AddChangeDto = {
      entity_type: entityType,
      entity_id: entityId,
      operation: ChangeOperation.UPDATE,
      old_data: oldData as Record<string, unknown>,
      new_data: newData as Record<string, unknown>,
      related_route_id: context?.related_route_id,
      related_stop_id: context?.related_stop_id,
      related_trip_id: context?.related_trip_id,
    };

    if (this.canSelfApprove(user)) {
      // Moderators/admins: create and auto-approve
      const result = await this.changesetService.createAndAutoApprove(
        user,
        `${ChangeOperation.UPDATE} ${entityType}: ${entityId}`,
        changeDto,
      );
      return { useChangeset: true, change: result.change, applied: true };
    }

    // Contributors: add to draft
    const draft = await this.changesetService.getOrCreateDraft(user);
    const change = await this.changesetService.addChange(draft.id, user, changeDto);
    return { useChangeset: true, change, applied: false };
  }

  /**
   * Create a change for a DELETE operation.
   * For contributors: adds to draft changeset
   * For moderators/admins: creates auto-approved changeset and applies the change
   */
  async handleDelete<T extends Record<string, unknown>>(
    user: User,
    entityType: EntityType,
    entityId: string,
    oldData: T,
    context?: {
      related_route_id?: string;
      related_stop_id?: string;
      related_trip_id?: string;
    },
  ): Promise<{ useChangeset: true; change: unknown; applied: boolean }> {
    const changeDto: AddChangeDto = {
      entity_type: entityType,
      entity_id: entityId,
      operation: ChangeOperation.DELETE,
      old_data: oldData as Record<string, unknown>,
      related_route_id: context?.related_route_id,
      related_stop_id: context?.related_stop_id,
      related_trip_id: context?.related_trip_id,
    };

    if (this.canSelfApprove(user)) {
      // Moderators/admins: create and auto-approve
      const result = await this.changesetService.createAndAutoApprove(
        user,
        `${ChangeOperation.DELETE} ${entityType}: ${entityId}`,
        changeDto,
      );
      return { useChangeset: true, change: result.change, applied: true };
    }

    // Contributors: add to draft
    const draft = await this.changesetService.getOrCreateDraft(user);
    const change = await this.changesetService.addChange(draft.id, user, changeDto);
    return { useChangeset: true, change, applied: false };
  }
}
