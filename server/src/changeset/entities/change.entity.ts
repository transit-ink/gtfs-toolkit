import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Changeset } from './changeset.entity';

export enum EntityType {
  AGENCY = 'agency',
  STOP = 'stop',
  ROUTE = 'route',
  TRIP = 'trip',
  STOP_TIME = 'stop_time',
  CALENDAR = 'calendar',
  CALENDAR_DATE = 'calendar_date',
  SHAPE = 'shape',
}

export enum ChangeOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

@Entity('changes')
export class Change {
  @ApiProperty({ description: 'Unique identifier for the change' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Changeset this change belongs to' })
  @Index()
  @Column({ type: 'uuid' })
  changeset_id: string;

  @ManyToOne(() => Changeset, (changeset) => changeset.changes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'changeset_id' })
  changeset: Changeset;

  @ApiProperty({ description: 'Type of entity being changed', enum: EntityType })
  @Index()
  @Column({ type: 'enum', enum: EntityType })
  entity_type: EntityType;

  @ApiProperty({
    description: 'GTFS ID of the entity (e.g., stop_id, route_id)',
  })
  @Index()
  @Column({ type: 'varchar' })
  entity_id: string;

  @ApiProperty({
    description: 'Type of operation',
    enum: ChangeOperation,
  })
  @Column({ type: 'enum', enum: ChangeOperation })
  operation: ChangeOperation;

  @ApiProperty({
    description: 'Previous state of the entity (for updates/deletes)',
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  old_data: Record<string, unknown> | null;

  @ApiProperty({
    description: 'New state of the entity (for creates/updates)',
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  new_data: Record<string, unknown> | null;

  // Context fields for cross-entity relationships
  @ApiProperty({
    description: 'Related route_id for trip/stop_time changes',
    nullable: true,
  })
  @Index()
  @Column({ type: 'varchar', nullable: true })
  related_route_id: string | null;

  @ApiProperty({
    description: 'Related stop_id for stop_time changes',
    nullable: true,
  })
  @Index()
  @Column({ type: 'varchar', nullable: true })
  related_stop_id: string | null;

  @ApiProperty({
    description: 'Related trip_id for stop_time changes',
    nullable: true,
  })
  @Index()
  @Column({ type: 'varchar', nullable: true })
  related_trip_id: string | null;

  @CreateDateColumn()
  created_at: Date;
}
