import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Calendar } from '../calendar/calendar.entity';
import { Route } from '../routes/route.entity';
import { Shape } from '../shapes/shape.entity';
import { StopTime } from '../stop_times/stop-time.entity';

export enum WheelchairAccessible {
  NO_INFO = 0,
  ACCESSIBLE = 1,
  NOT_ACCESSIBLE = 2,
}

export enum BikesAllowed {
  NO_INFO = 0,
  ALLOWED = 1,
  NOT_ALLOWED = 2,
}

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Unique identifier for the trip' })
  @Index({ unique: true })
  @Column()
  trip_id: string;

  @ApiProperty({ description: 'ID of the route that this trip belongs to' })
  @Index('idx_trips_route_id')
  @Column()
  route_id: string;

  @ApiProperty({
    description: 'ID of the calendar service that specifies when the trip runs',
  })
  @Index('idx_trips_service_id')
  @Column()
  service_id: string;

  @ApiProperty({
    description:
      "Text that appears on signage identifying the trip's destination",
  })
  @Column({ nullable: true })
  trip_headsign?: string;

  @ApiProperty({
    description: 'Text that appears in schedules and sign boards',
  })
  @Column({ nullable: true })
  trip_short_name?: string;

  @ApiProperty({ description: 'Indicates the direction of travel' })
  @Column({ type: 'boolean', nullable: true })
  direction_id?: boolean;

  @ApiProperty({
    description: 'Identifies the block to which the trip belongs',
  })
  @Column({ nullable: true })
  block_id?: string;

  @ApiProperty({ description: "ID of the shape that defines the trip's path" })
  @Column({ nullable: true })
  shape_id?: string;

  @ApiProperty({
    description: 'Indicates if the trip is accessible by wheelchair',
    enum: WheelchairAccessible,
  })
  @Column({ type: 'enum', enum: WheelchairAccessible, nullable: true })
  wheelchair_accessible?: WheelchairAccessible;

  @ApiProperty({
    description: 'Indicates if bikes are allowed on the trip',
    enum: BikesAllowed,
  })
  @Column({ type: 'enum', enum: BikesAllowed, nullable: true })
  bikes_allowed?: BikesAllowed;

  @ManyToOne(() => Route, (route) => route.trips)
  @JoinColumn({ name: 'route_id', referencedColumnName: 'route_id' })
  route: Route;

  @ManyToOne(() => Calendar, (calendar) => calendar.trips)
  @JoinColumn({ name: 'service_id', referencedColumnName: 'service_id' })
  calendar: Calendar;

  @ManyToMany(() => Shape, (shape) => shape.trips)
  @JoinColumn({ name: 'shape_id', referencedColumnName: 'shape_id' })
  shape: Shape;

  @OneToMany(() => StopTime, (stopTime) => stopTime.trip)
  stop_times: StopTime[];
}
