import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  PaginatedResponse,
  PaginationParams,
} from '../../common/interfaces/pagination.interface';
import { GtfsSearchResponseItem } from '../routes/gtfs.entity';
import { StopTime } from '../stop_times/stop-time.entity';
import { Trip } from '../trips/trip.entity';
import { Stop } from './stop.entity';

@Injectable()
export class StopsService {
  constructor(
    @InjectRepository(Stop)
    private stopRepository: Repository<Stop>,
    @InjectRepository(StopTime)
    private stopTimeRepository: Repository<StopTime>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    private dataSource: DataSource,
  ) {}

  async findAll(params?: PaginationParams): Promise<PaginatedResponse<Stop>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'stop_id',
      sortOrder = 'ASC',
    } = params || {};

    const queryBuilder = this.stopRepository.createQueryBuilder('stop');

    // Add sorting
    queryBuilder.orderBy(`stop.${sortBy}`, sortOrder);

    // Add pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    // Get total count
    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<Stop> {
    const stop = await this.stopRepository.findOne({ where: { stop_id: id } });
    if (!stop) {
      throw new NotFoundException(`Stop with ID ${id} not found`);
    }
    return stop;
  }

  async findByIds(ids: string[]): Promise<Stop[]> {
    return this.stopRepository.find({ where: { stop_id: In(ids) } });
  }

  async create(stopData: Partial<Stop>): Promise<Stop> {
    const newStop = this.stopRepository.create(stopData as Stop);
    return this.stopRepository.save(newStop);
  }

  async update(id: string, stopData: Partial<Stop>): Promise<Stop> {
    const existingStop = await this.findById(id);
    const updatedStop = this.stopRepository.merge(existingStop, stopData as Stop);
    return this.stopRepository.save(updatedStop);
  }

  async findByLatLon(
    lat: number,
    lon: number,
    radius: number,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<Stop>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'stop_id',
      sortOrder = 'ASC',
    } = params || {};

    const queryBuilder = this.stopRepository
      .createQueryBuilder('stop')
      .where(
        'ST_DWithin(ST_MakePoint(stop.stop_lon, stop.stop_lat)::geography, ST_MakePoint(:lon, :lat)::geography, :radius)',
        { lon, lat, radius },
      );

    // Add sorting
    queryBuilder.orderBy(`stop.${sortBy}`, sortOrder);

    // Add pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    // Get total count
    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async search(query: string, minScore?: number): Promise<GtfsSearchResponseItem[]> {
    const threshold = minScore ?? 0;
    const ql = `
      SELECT
        json_build_object(
          'stop_id', stops.stop_id,
          'stop_name', stops.stop_name,
          'stop_lat', stops.stop_lat,
          'stop_lon', stops.stop_lon,
          'stop_code', stops.stop_code,
          'stop_desc', stops.stop_desc,
          'stop_url', stops.stop_url,
          'parent_station', stops.parent_station
        ) as stop,
        similarity(stop_name, $1) AS score
      FROM
        stops
      WHERE
        similarity(stop_name, $1) > $2
      ORDER BY
        score DESC
      LIMIT 10
    `;
    return await this.stopRepository.query(ql, [query, threshold]);
  }

  async findByIdOrParentStation(stopId: string): Promise<Stop[]> {
    // First, find the stop to check if it has a parent_station
    const stop = await this.stopRepository.findOne({ where: { stop_id: stopId } });
    
    if (!stop) {
      return [];
    }

    // If the stop has a parent_station, use the parent to find all siblings
    const parentId = stop.parent_station || stopId;
    
    // Return the parent and all its children (siblings)
    return this.stopRepository.find({
      where: [{ stop_id: parentId }, { parent_station: parentId }],
    });
  }

  async findChildStops(parentStopIds: string[]): Promise<Stop[]> {
    if (parentStopIds.length === 0) {
      return [];
    }
    return this.stopRepository.find({
      where: { parent_station: In(parentStopIds) },
    });
  }

  async findInBounds(
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number,
    limit = 100,
  ): Promise<Stop[]> {
    return this.stopRepository
      .createQueryBuilder('stop')
      .where('stop.stop_lat >= :minLat', { minLat })
      .andWhere('stop.stop_lat <= :maxLat', { maxLat })
      .andWhere('stop.stop_lon >= :minLon', { minLon })
      .andWhere('stop.stop_lon <= :maxLon', { maxLon })
      .andWhere('(stop.parent_station IS NULL OR stop.parent_station = :empty)', { empty: '' })
      .orderBy('stop.stop_name', 'ASC')
      .limit(limit)
      .getMany();
  }

  async findAllInBounds(
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number,
    limit = 200,
  ): Promise<Stop[]> {
    // Fetch all stops (including child stops) within bounds
    return this.stopRepository
      .createQueryBuilder('stop')
      .where('stop.stop_lat >= :minLat', { minLat })
      .andWhere('stop.stop_lat <= :maxLat', { maxLat })
      .andWhere('stop.stop_lon >= :minLon', { minLon })
      .andWhere('stop.stop_lon <= :maxLon', { maxLon })
      .orderBy('stop.stop_name', 'ASC')
      .limit(limit)
      .getMany();
  }

  async getTripsForStop(stopId: string): Promise<Trip[]> {
    // Use a single JOIN-based query to fetch trips that have this stop
    const trips = await this.tripRepository
      .createQueryBuilder('trip')
      .innerJoin(StopTime, 'st', 'st.trip_id = trip.trip_id')
      .where('st.stop_id = :stopId', { stopId })
      .distinct(true)
      .getMany();

    return trips;
  }

  async delete(id: string): Promise<void> {
    const stop = await this.findById(id);

    // Use a transaction to ensure data consistency
    await this.dataSource.transaction(async (manager) => {
      // Remove stop_times referencing this stop
      await manager
        .createQueryBuilder()
        .delete()
        .from(StopTime)
        .where('stop_id = :id', { id })
        .execute();

      // Remove parent_station references from child stops
      await manager
        .createQueryBuilder()
        .update(Stop)
        .set({ parent_station: '' })
        .where('parent_station = :id', { id })
        .execute();

      // Delete the stop
      await manager.remove(stop);
    });
  }
}
