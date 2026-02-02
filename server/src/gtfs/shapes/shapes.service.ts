import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaginationParams } from '../../common/interfaces/pagination.interface';
import { Shape } from './shape.entity';

export interface ShapePoint {
  lat: number;
  lon: number;
  sequence: number;
  distTraveled?: number;
}

export interface UpdateShapeDto {
  shapeId: string;
  points: ShapePoint[];
}

@Injectable()
export class ShapesService {
  constructor(
    @InjectRepository(Shape)
    private shapeRepository: Repository<Shape>,
  ) {}

  async findAll(
    params?: PaginationParams,
  ): Promise<{ data: Shape[]; meta: { total: number; totalPages: number } }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'shape_id',
      sortOrder = 'ASC',
    } = params || {};
    const skip = (page - 1) * limit;

    const [data, total] = await this.shapeRepository.findAndCount({
      skip,
      take: limit,
      order: {
        [sortBy]: sortOrder,
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        totalPages,
      },
    };
  }

  async findById(id: string): Promise<Shape[]> {
    return this.shapeRepository.find({ where: { shape_id: id } });
  }

  async findByIds(ids: string[]): Promise<Shape[]> {
    return this.shapeRepository.find({ where: { shape_id: In(ids) } });
  }

  async updateShape(dto: UpdateShapeDto): Promise<{ updated: number }> {
    const { shapeId, points } = dto;

    // Delete all existing shape points for this shape_id
    await this.shapeRepository.delete({ shape_id: shapeId });

    // Insert new shape points
    const newShapePoints = points.map((point) => ({
      shape_id: shapeId,
      shape_pt_lat: point.lat,
      shape_pt_lon: point.lon,
      shape_pt_sequence: point.sequence,
      shape_dist_traveled: point.distTraveled,
    }));

    await this.shapeRepository.insert(newShapePoints);

    return { updated: points.length };
  }
}
