import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Stop } from '../stops/stop.entity';
import { Trip } from '../trips/trip.entity';

export enum PickupType {
  REGULAR = 0,
  NOT_AVAILABLE = 1,
  PHONE_AGENCY = 2,
  COORDINATE_WITH_DRIVER = 3,
}

export enum DropOffType {
  REGULAR = 0,
  NOT_AVAILABLE = 1,
  PHONE_AGENCY = 2,
  COORDINATE_WITH_DRIVER = 3,
}

@Index('idx_stop_times_trip_id_stop_sequence', ['trip_id', 'stop_sequence'])
@Entity('stop_times')
export class StopTime {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ID of the trip' })
  @Index('idx_stop_times_trip_id')
  @Column()
  trip_id: string;

  @ApiProperty({ description: 'Arrival time at the stop' })
  @Column({ nullable: true })
  arrival_time?: string;

  @ApiProperty({ description: 'Departure time from the stop' })
  @Column({ nullable: true })
  departure_time?: string;

  @ApiProperty({ description: 'ID of the stop' })
  @Index('idx_stop_times_stop_id')
  @PrimaryColumn()
  stop_id: string;

  @ApiProperty({ description: 'Order of the stop in the trip' })
  @Column()
  stop_sequence: number;

  @ApiProperty({ description: 'Text that appears on signage for the stop' })
  @Column({ nullable: true })
  stop_headsign?: string;

  @ApiProperty({ description: 'Text that appears on signage for the stop' })
  @Column({ nullable: true })
  stop_tts_headsign?: string;

  @ApiProperty({
    description: 'Indicates whether passengers are picked up at the stop',
    enum: PickupType,
  })
  @Column({ type: 'enum', enum: PickupType, nullable: true })
  pickup_type?: PickupType;

  @ApiProperty({
    description: 'Indicates whether passengers are dropped off at the stop',
    enum: DropOffType,
  })
  @Column({ type: 'enum', enum: DropOffType, nullable: true })
  drop_off_type?: DropOffType;

  @ApiProperty({
    description: 'Indicates whether continuous pickup is available',
  })
  @Column({ nullable: true })
  continuous_pickup?: string;

  @ApiProperty({
    description: 'Indicates whether continuous drop-off is available',
  })
  @Column({ nullable: true })
  continuous_drop_off?: string;

  @ApiProperty({
    description: 'Distance traveled along the shape from the first shape point',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  shape_dist_traveled?: number;

  @ApiProperty({
    description: 'Indicates whether the arrival and departure times are exact',
  })
  @Column({ type: 'boolean', nullable: true })
  timepoint?: boolean;

  @ManyToOne(() => Trip, (trip) => trip.stop_times)
  @JoinColumn({ name: 'trip_id', referencedColumnName: 'trip_id' })
  trip: Trip;

  @ManyToOne(() => Stop, (stop) => stop.stop_times)
  @JoinColumn({ name: 'stop_id', referencedColumnName: 'stop_id' })
  stop: Stop;
}
