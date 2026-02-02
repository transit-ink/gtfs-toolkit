import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  PaginatedResponse,
  PaginationParams,
} from '../../common/interfaces/pagination.interface';
import { StopTime } from '../stop_times/stop-time.entity';
import { Trip } from './trip.entity';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(StopTime)
    private stopTimeRepository: Repository<StopTime>,
  ) {}

  async findAll(params?: PaginationParams): Promise<PaginatedResponse<Trip>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'trip_id',
      sortOrder = 'ASC',
      routeId,
      routeIds,
    } = params || {};

    const queryBuilder = this.tripRepository.createQueryBuilder('trip');

    // Add route filter if provided
    if (routeIds && routeIds.length > 0) {
      queryBuilder.where('trip.route_id IN (:...routeIds)', { routeIds });
    } else if (routeId) {
      queryBuilder.where('trip.route_id = :routeId', { routeId });
    }

    // Add sorting
    queryBuilder.orderBy(`trip.${sortBy}`, sortOrder);

    console.log(page, limit);
    console.log((page - 1) * limit);

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

  async findById(id: string): Promise<Trip> {
    const trip = await this.tripRepository.findOne({ where: { trip_id: id } });
    if (!trip) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }
    return trip;
  }

  async findBulk(ids: string[]): Promise<Trip[]> {
    const trips = await this.tripRepository.find({
      where: { trip_id: In(ids) },
    });
    return trips;
  }

  async create(trip: Trip): Promise<Trip> {
    const newTrip = this.tripRepository.create(trip);
    return this.tripRepository.save(newTrip);
  }

  async update(id: string, trip: Trip): Promise<Trip> {
    const existingTrip = await this.findById(id);
    const updatedTrip = this.tripRepository.merge(existingTrip, trip);
    return this.tripRepository.save(updatedTrip);
  }

  async duplicateTrip(
    sourceTripId: string,
    newTripId: string,
    timeIncrementMinutes: number = 5,
  ): Promise<{ trip: Trip; stopTimes: StopTime[] }> {
    // Get source trip
    const sourceTrip = await this.findById(sourceTripId);
    if (!sourceTrip) {
      throw new NotFoundException(`Trip with ID ${sourceTripId} not found`);
    }

    // Check if new trip ID already exists
    const existingTrip = await this.tripRepository.findOne({
      where: { trip_id: newTripId },
    });
    if (existingTrip) {
      throw new Error(`Trip with ID ${newTripId} already exists`);
    }

    // Create new trip
    const newTrip = this.tripRepository.create({
      trip_id: newTripId,
      route_id: sourceTrip.route_id,
      service_id: sourceTrip.service_id,
      trip_headsign: sourceTrip.trip_headsign,
      trip_short_name: sourceTrip.trip_short_name,
      direction_id: sourceTrip.direction_id,
      block_id: sourceTrip.block_id,
      shape_id: sourceTrip.shape_id,
      wheelchair_accessible: sourceTrip.wheelchair_accessible,
      bikes_allowed: sourceTrip.bikes_allowed,
    });
    const savedTrip = await this.tripRepository.save(newTrip);

    // Get source stop times
    const sourceStopTimes = await this.stopTimeRepository.find({
      where: { trip_id: sourceTripId },
      order: { stop_sequence: 'ASC' },
    });

    if (sourceStopTimes.length === 0) {
      throw new NotFoundException(`No stop times found for trip ${sourceTripId}`);
    }

    // Helper function to add minutes to a time string
    const addMinutes = (timeStr: string | null | undefined, minutes: number): string | undefined => {
      if (!timeStr) return undefined;
      const parts = timeStr.split(':');
      if (parts.length !== 3) return timeStr;
      
      let hours = parseInt(parts[0], 10);
      let mins = parseInt(parts[1], 10);
      let seconds = parseInt(parts[2], 10);
      
      const totalMinutes = hours * 60 + mins + minutes;
      const newTotalMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
      
      hours = Math.floor(newTotalMinutes / 60);
      mins = newTotalMinutes % 60;
      
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    // Create new stop times with incremented times
    const newStopTimes = sourceStopTimes.map((st) => {
      const newStopTime = new StopTime();
      newStopTime.trip_id = newTripId;
      newStopTime.stop_id = st.stop_id;
      newStopTime.stop_sequence = st.stop_sequence;
      newStopTime.arrival_time = st.arrival_time ? addMinutes(st.arrival_time, timeIncrementMinutes) : undefined;
      newStopTime.departure_time = st.departure_time ? addMinutes(st.departure_time, timeIncrementMinutes) : undefined;
      newStopTime.stop_headsign = st.stop_headsign;
      newStopTime.stop_tts_headsign = st.stop_tts_headsign;
      newStopTime.pickup_type = st.pickup_type;
      newStopTime.drop_off_type = st.drop_off_type;
      newStopTime.continuous_pickup = st.continuous_pickup;
      newStopTime.continuous_drop_off = st.continuous_drop_off;
      newStopTime.shape_dist_traveled = st.shape_dist_traveled;
      newStopTime.timepoint = st.timepoint;
      return newStopTime;
    });

    await this.stopTimeRepository.save(newStopTimes);

    return { trip: savedTrip, stopTimes: newStopTimes };
  }

  async delete(id: string): Promise<void> {
    const trip = await this.findById(id);
    
    // Delete all stop times for this trip first (cascade delete)
    await this.stopTimeRepository.delete({ trip_id: id });
    
    // Delete the trip
    await this.tripRepository.delete({ trip_id: id });
  }
}
