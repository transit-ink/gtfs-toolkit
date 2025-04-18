import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaginationParams } from '../../common/interfaces/pagination.interface';
import { Shape } from './shape.entity';

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
}
