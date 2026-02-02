import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum GroupItemType {
  ROUTE = 'route',
  STOP = 'stop',
}

export interface GroupItem {
  type: GroupItemType;
  id: string;
}

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Unique identifier for the group' })
  @Index({ unique: true })
  @Column()
  group_id: string;

  @ApiProperty({ description: 'Name of the group' })
  @Column()
  name: string;

  @ApiProperty({ description: 'Description of the group' })
  @Column({ nullable: true })
  description?: string;

  @ApiProperty({
    description: 'Ordered list of items (routes and stops) in the group',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['route', 'stop'] },
        id: { type: 'string' },
      },
    },
  })
  @Column({ type: 'jsonb', default: [] })
  items: GroupItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
