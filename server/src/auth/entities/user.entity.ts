import { ApiProperty } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { Transform } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  CONTRIBUTOR = 'contributor', // Can propose changes via changesets
  MODERATOR = 'moderator', // Can approve/reject changesets
  ADMIN = 'admin', // Can manage users and roles
}

@Entity('users')
export class User {
  @ApiProperty({ description: 'Unique identifier for the user' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Username for the user' })
  @Column({ unique: true })
  @Transform(({ value }) => value?.trim())
  username: string;

  @ApiProperty({ description: 'Email for the user', required: false })
  @Column({ type: 'varchar', unique: true, nullable: true })
  @Transform(({ value }) => value?.trim())
  email?: string | null;

  @Column()
  password: string;

  @ApiProperty({ description: 'User roles', enum: UserRole, isArray: true })
  @Column('enum', { array: true, enum: UserRole, default: [UserRole.CONTRIBUTOR] })
  roles: UserRole[];

  @ApiProperty({ description: 'Whether the email is verified' })
  @Column({ default: false })
  isEmailVerified: boolean;

  @ApiProperty({ description: 'Profile URL', required: false })
  @Column({ nullable: true })
  profileUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  async hashPassword(): Promise<void> {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
