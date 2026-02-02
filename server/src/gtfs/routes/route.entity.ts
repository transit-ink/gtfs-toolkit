import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Agency } from '../agency/agency.entity';
import { Trip } from '../trips/trip.entity';

export enum RouteType {
  TRAM = 0,
  SUBWAY = 1,
  RAIL = 2,
  BUS = 3,
  FERRY = 4,
  CABLE_TRAM = 5,
  AERIAL_LIFT = 6,
  FUNICULAR = 7,
  TROLLEYBUS = 800,
  MONORAIL = 900,
}

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ID of the route' })
  @Index({ unique: true })
  @Column()
  route_id: string;

  @ApiProperty({ description: 'ID of the agency' })
  @Column()
  agency_id: string;

  @ApiProperty({ description: 'Short name of the route' })
  @Column()
  route_short_name: string;

  @ApiProperty({ description: 'Full name of the route' })
  @Column({ nullable: true })
  route_long_name?: string;

  @ApiProperty({ description: 'Description of the route' })
  @Column({ nullable: true })
  route_desc?: string;

  @ApiProperty({ description: 'Type of the route', enum: RouteType })
  @Column({ type: 'int', enum: RouteType })
  route_type: RouteType;

  @ApiProperty({ description: 'URL of a web page about the route' })
  @Column({ nullable: true })
  route_url?: string;

  @ApiProperty({ description: 'Color of the route' })
  @Column({ nullable: true })
  route_color?: string;

  @ApiProperty({ description: 'Text color of the route' })
  @Column({ nullable: true })
  route_text_color?: string;

  @ApiProperty({ description: 'Order in which to display the route' })
  @Column({ type: 'int', nullable: true })
  route_sort_order?: number;

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

  @ApiProperty({ description: 'ID of the network' })
  @Column({ nullable: true })
  network_id?: string;

  @ManyToOne(() => Agency, (agency) => agency.routes)
  @JoinColumn({ name: 'agency_id', referencedColumnName: 'agency_id' })
  agency: Agency;

  @OneToMany(() => Trip, (trip) => trip.route)
  trips: Trip[];
}
