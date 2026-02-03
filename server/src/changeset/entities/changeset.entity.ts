import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Change } from './change.entity';

export enum ChangesetStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('changesets')
export class Changeset {
  @ApiProperty({ description: 'Unique identifier for the changeset' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User who created the changeset' })
  @Index()
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({
    description: 'Status of the changeset',
    enum: ChangesetStatus,
  })
  @Index()
  @Column({
    type: 'enum',
    enum: ChangesetStatus,
    default: ChangesetStatus.DRAFT,
  })
  status: ChangesetStatus;

  @ApiProperty({
    description: 'Description of the changes (required when submitting)',
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'User who reviewed the changeset' })
  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;

  @ApiProperty({ description: 'When the changeset was reviewed' })
  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  @ApiProperty({ description: 'Moderator feedback/comment' })
  @Column({ type: 'text', nullable: true })
  review_comment: string | null;

  @ApiProperty({ description: 'Changes in this changeset' })
  @OneToMany(() => Change, (change) => change.changeset, { cascade: true })
  changes: Change[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
