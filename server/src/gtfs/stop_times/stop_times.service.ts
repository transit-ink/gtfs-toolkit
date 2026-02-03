import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  PaginatedResponse,
  PaginationParams,
} from '../../common/interfaces/pagination.interface';
import { StopTime } from './stop-time.entity';

export interface ReorderStopTimesDto {
  tripIds: string[];
  stopSequence: { stopId: string; sequence: number }[];
}

export interface AddStopToTripsDto {
  tripIds: string[];
  stopId: string;
  arrivalTime: string;
  departureTime: string;
}

export interface RemoveStopFromTripsDto {
  tripIds: string[];
  stopId: string;
}

export interface BulkUpdateStopTimeDto {
  tripId: string;
  stopId: string;
  arrivalTime?: string;
  departureTime?: string;
}

export interface BulkUpdateStopTimesDto {
  updates: BulkUpdateStopTimeDto[];
}

@Injectable()
export class StopTimesService {
  constructor(
    @InjectRepository(StopTime)
    private stopTimesRepository: Repository<StopTime>,
  ) {}

  async findAll(findData: {
    tripIds?: string[];
    stopIds?: string[];
    params?: PaginationParams;
  }): Promise<PaginatedResponse<StopTime>> {
    const { tripIds, stopIds, params } = findData;
    const {
      page = 1,
      limit = 10,
      sortBy = 'trip_id',
      sortOrder = 'ASC',
    } = params || {};

    const queryBuilder =
      this.stopTimesRepository.createQueryBuilder('stop_time');

    if (tripIds) {
      queryBuilder.where('stop_time.trip_id IN (:...tripIds)', { tripIds });
    }

    if (stopIds) {
      queryBuilder.where('stop_time.stop_id IN (:...stopIds)', { stopIds });
    }

    // Add sorting
    queryBuilder.orderBy(`stop_time.${sortBy}`, sortOrder);

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

  async findOne(tripId: string): Promise<StopTime> {
    const stopTime = await this.stopTimesRepository.findOneBy({
      trip_id: tripId,
    });
    if (!stopTime) {
      throw new NotFoundException(`Stop time with trip ID ${tripId} not found`);
    }
    return stopTime;
  }

  async create(stopTime: StopTime): Promise<StopTime> {
    const newStopTime = this.stopTimesRepository.create(stopTime);
    return this.stopTimesRepository.save(newStopTime);
  }

  async update(tripId: string, stopTime: StopTime): Promise<StopTime> {
    const existingStopTime = await this.findOne(tripId);
    const updatedStopTime = this.stopTimesRepository.merge(
      existingStopTime,
      stopTime,
    );
    return this.stopTimesRepository.save(updatedStopTime);
  }

  async reorderStopTimes(dto: ReorderStopTimesDto): Promise<{ updated: number }> {
    const { tripIds, stopSequence } = dto;

    // Create a map of stopId -> new sequence
    const sequenceMap = new Map<string, number>();
    stopSequence.forEach(({ stopId, sequence }) => {
      sequenceMap.set(stopId, sequence);
    });

    // Fetch all stop times for the given trips
    const stopTimes = await this.stopTimesRepository.find({
      where: { trip_id: In(tripIds) },
    });

    // Update the stop_sequence for each stop time
    const updatedStopTimes = stopTimes.map((st) => {
      const newSequence = sequenceMap.get(st.stop_id);
      if (newSequence !== undefined) {
        st.stop_sequence = newSequence;
      }
      return st;
    });

    // Save all updated stop times
    await this.stopTimesRepository.save(updatedStopTimes);

    return { updated: updatedStopTimes.length };
  }

  async addStopToTrips(dto: AddStopToTripsDto): Promise<{ added: number }> {
    const { tripIds, stopId, arrivalTime, departureTime } = dto;

    const uniqueTripIds = Array.from(new Set(tripIds));

    if (uniqueTripIds.length === 0) {
      return { added: 0 };
    }

    // Fetch current max stop_sequence for all trips in a single query
    const maxSequencesRaw = await this.stopTimesRepository
      .createQueryBuilder('st')
      .select('st.trip_id', 'trip_id')
      .addSelect('MAX(st.stop_sequence)', 'max_seq')
      .where('st.trip_id IN (:...tripIds)', { tripIds: uniqueTripIds })
      .groupBy('st.trip_id')
      .getRawMany<{ trip_id: string; max_seq: string | null }>();

    const maxSequenceByTrip = new Map<string, number>();
    maxSequencesRaw.forEach((row) => {
      const maxSeq = row.max_seq !== null ? parseInt(row.max_seq, 10) : 0;
      maxSequenceByTrip.set(row.trip_id, Number.isNaN(maxSeq) ? 0 : maxSeq);
    });

    // Fetch all trips that already have this stop in a single query
    const existingForStop = await this.stopTimesRepository.find({
      where: { trip_id: In(uniqueTripIds), stop_id: stopId },
      select: ['trip_id'],
    });

    const tripsWithStop = new Set(existingForStop.map((st) => st.trip_id));

    // Build new stop_times for trips that do not yet contain this stop
    const newStopTimes = uniqueTripIds
      .filter((tripId) => !tripsWithStop.has(tripId))
      .map((tripId) => {
        const currentMaxSeq = maxSequenceByTrip.get(tripId) ?? 0;
        return this.stopTimesRepository.create({
          trip_id: tripId,
          stop_id: stopId,
          stop_sequence: currentMaxSeq + 1,
          arrival_time: arrivalTime,
          departure_time: departureTime,
        });
      });

    if (newStopTimes.length === 0) {
      return { added: 0 };
    }

    await this.stopTimesRepository.insert(newStopTimes);

    return { added: newStopTimes.length };
  }

  async removeStopFromTrips(dto: RemoveStopFromTripsDto): Promise<{ removed: number }> {
    const { tripIds, stopId } = dto;

    const result = await this.stopTimesRepository.delete({
      trip_id: In(tripIds),
      stop_id: stopId,
    });

    // Resequence remaining stops for all affected trips in a single pass
    const remainingStopTimes = await this.stopTimesRepository.find({
      where: { trip_id: In(tripIds) },
      order: { trip_id: 'ASC', stop_sequence: 'ASC' },
    });

    let currentTripId: string | null = null;
    let sequenceCounter = 0;

    const updatedStopTimes = remainingStopTimes.map((st) => {
      if (st.trip_id !== currentTripId) {
        currentTripId = st.trip_id;
        sequenceCounter = 1;
      } else {
        sequenceCounter += 1;
      }
      st.stop_sequence = sequenceCounter;
      return st;
    });

    if (updatedStopTimes.length > 0) {
      await this.stopTimesRepository.save(updatedStopTimes);
    }

    return { removed: result.affected || 0 };
  }

  async bulkUpdateStopTimes(dto: BulkUpdateStopTimesDto): Promise<{ updated: number }> {
    const { updates } = dto;

    if (updates.length === 0) {
      return { updated: 0 };
    }

    // Build VALUES clause for the updates
    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    updates.forEach((update) => {
      const tripIdParam = `$${paramIndex++}`;
      const stopIdParam = `$${paramIndex++}`;
      const arrivalTimeParam = `$${paramIndex++}`;
      const departureTimeParam = `$${paramIndex++}`;

      values.push(`(${tripIdParam}, ${stopIdParam}, ${arrivalTimeParam}, ${departureTimeParam})`);
      params.push(update.tripId, update.stopId, update.arrivalTime || null, update.departureTime || null);
    });

    // Use PostgreSQL's UPDATE ... FROM VALUES to do bulk update in a single query
    // This is much faster than individual queries (N queries -> 1 query)
    // Use RETURNING to get the count of updated rows
    const query = `
      WITH updated AS (
        UPDATE stop_times st
        SET 
          arrival_time = CASE 
            WHEN v.arrival_time IS NOT NULL THEN v.arrival_time 
            ELSE st.arrival_time 
          END,
          departure_time = CASE 
            WHEN v.departure_time IS NOT NULL THEN v.departure_time 
            ELSE st.departure_time 
          END
        FROM (VALUES ${values.join(', ')}) AS v(trip_id, stop_id, arrival_time, departure_time)
        WHERE st.trip_id = v.trip_id AND st.stop_id = v.stop_id
        RETURNING st.id
      )
      SELECT COUNT(*) as count FROM updated
    `;

    const result = await this.stopTimesRepository.manager.query(query, params);
    const updatedCount = parseInt(result[0]?.count || '0', 10);

    return { updated: updatedCount };
  }
}
