import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StopTime } from '../stop_times/stop-time.entity';

export enum LocationType {
  STOP = 0,
  STATION = 1,
  ENTRANCE_EXIT = 2,
  GENERIC_NODE = 3,
  BOARDING_AREA = 4,
}

export enum WheelchairBoarding {
  UNKNOWN = 0,
  POSSIBLE = 1,
  NOT_POSSIBLE = 2,
}

@Index('idx_stops_lat_lon', ['stop_lat', 'stop_lon'])
@Index('idx_stops_parent_station', ['parent_station'])
@Entity('stops')
export class Stop {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Unique identifier for the stop' })
  @Index({ unique: true })
  @Column()
  stop_id: string;

  @ApiProperty({
    description: 'Short text or number that identifies the stop for riders',
  })
  @Column({ nullable: true })
  stop_code?: string;

  @ApiProperty({ description: 'Name of the stop' })
  @Column()
  stop_name: string;

  @ApiProperty({ description: 'Text that appears on signage for the stop' })
  @Column({ nullable: true })
  tts_stop_name?: string;

  @ApiProperty({ description: 'Description of the stop' })
  @Column({ nullable: true })
  stop_desc?: string;

  @ApiProperty({ description: 'Latitude of the stop' })
  @Column({ type: 'decimal', precision: 10, scale: 8 })
  stop_lat: number;

  @ApiProperty({ description: 'Longitude of the stop' })
  @Column({ type: 'decimal', precision: 11, scale: 8 })
  stop_lon: number;

  @ApiProperty({ description: 'ID of the fare zone containing the stop' })
  @Column({ nullable: true })
  zone_id?: string;

  @ApiProperty({ description: 'URL of a web page about the stop' })
  @Column({ nullable: true })
  stop_url?: string;

  @ApiProperty({ description: 'Location type of the stop' })
  @Column({ type: 'enum', enum: LocationType, nullable: true })
  location_type?: LocationType;

  @ApiProperty({ description: 'ID of the parent station' })
  @Column({ nullable: true })
  parent_station?: string;

  @ApiProperty({ description: 'Timezone of the stop' })
  @Column({ nullable: true })
  stop_timezone?: string;

  @ApiProperty({
    description: 'Indicates whether wheelchair boardings are possible',
  })
  @Column({ type: 'enum', enum: WheelchairBoarding, nullable: true })
  wheelchair_boarding?: WheelchairBoarding;

  @ApiProperty({ description: 'ID of the level containing the stop' })
  @Column({ nullable: true })
  level_id?: string; // TODO: Handle levels.txt

  @ApiProperty({ description: 'Platform identifier for the stop' })
  @Column({ nullable: true })
  platform_code?: string;

  @OneToMany(() => StopTime, (stopTime) => stopTime.stop)
  stop_times: StopTime[];
}
