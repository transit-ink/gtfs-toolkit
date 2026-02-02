import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  PaginatedResponse,
  PaginationParams,
} from '../../common/interfaces/pagination.interface';
import { Trip } from '../trips/trip.entity';
import { GtfsSearchResponseItem } from './gtfs.entity';
import { Route } from './route.entity';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route)
    private routesRepository: Repository<Route>,
    @InjectRepository(Trip)
    private tripsRepository: Repository<Trip>,
    private dataSource: DataSource,
  ) {}

  async findAll(
    agencyId?: string,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<Route>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'route_id',
      sortOrder = 'ASC',
    } = params || {};

    const queryBuilder = this.routesRepository.createQueryBuilder('route');

    if (agencyId) {
      queryBuilder.where('route.agency_id = :agencyId', { agencyId });
    }

    // Add sorting
    queryBuilder.orderBy(`route.${sortBy}`, sortOrder);

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

  async findBulk(ids: string[]): Promise<Route[]> {
    const routes = await this.routesRepository.find({
      where: { route_id: In(ids) },
    });
    return routes;
  }

  async findOne(id: string): Promise<Route> {
    const route = await this.routesRepository.findOneBy({ route_id: id });
    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }
    return route;
  }

  async findByAgency(
    agencyId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<Route>> {
    return this.findAll(agencyId, params);
  }

  async create(route: Route): Promise<Route> {
    const newRoute = this.routesRepository.create(route);
    return this.routesRepository.save(newRoute);
  }

  async update(id: string, route: Partial<Route>): Promise<Route> {
    const routeIdChanged = route.route_id && route.route_id !== id;

    if (routeIdChanged) {
      // Check if the new route_id already exists
      const existingRouteWithNewId = await this.routesRepository.findOneBy({
        route_id: route.route_id,
      });
      if (existingRouteWithNewId && existingRouteWithNewId.route_id !== id) {
        throw new ConflictException(
          `Route with ID ${route.route_id} already exists`,
        );
      }

      // Use a transaction to handle route_id change and foreign key constraints
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Create new route with updated fields, copying existing values for fields not provided
        await queryRunner.query(
          `
          INSERT INTO routes (
            route_id, agency_id, route_short_name, route_long_name, route_desc,
            route_type, route_url, route_color, route_text_color, route_sort_order,
            continuous_pickup, continuous_drop_off, network_id
          )
          SELECT
            COALESCE($1, route_id),
            COALESCE($2, agency_id),
            COALESCE($3, route_short_name),
            COALESCE($4, route_long_name),
            COALESCE($5, route_desc),
            COALESCE($6, route_type),
            COALESCE($7, route_url),
            COALESCE($8, route_color),
            COALESCE($9, route_text_color),
            COALESCE($10, route_sort_order),
            COALESCE($11, continuous_pickup),
            COALESCE($12, continuous_drop_off),
            COALESCE($13, network_id)
          FROM routes
          WHERE route_id = $14
        `,
          [
            route.route_id,
            route.agency_id ?? null,
            route.route_short_name ?? null,
            route.route_long_name ?? null,
            route.route_desc ?? null,
            route.route_type ?? null,
            route.route_url ?? null,
            route.route_color ?? null,
            route.route_text_color ?? null,
            route.route_sort_order ?? null,
            route.continuous_pickup ?? null,
            route.continuous_drop_off ?? null,
            route.network_id ?? null,
            id,
          ],
        );

        // Update trips to reference the new route_id
        await queryRunner.query(
          `UPDATE trips SET route_id = $1 WHERE route_id = $2`,
          [route.route_id, id],
        );

        // Delete the old route
        await queryRunner.query(`DELETE FROM routes WHERE route_id = $1`, [id]);

        await queryRunner.commitTransaction();
        return await this.findOne(route.route_id!);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      // No route_id change - simple update using COALESCE to only update provided fields
      await this.routesRepository.query(
        `
        UPDATE routes SET
          agency_id = COALESCE($1, agency_id),
          route_short_name = COALESCE($2, route_short_name),
          route_long_name = COALESCE($3, route_long_name),
          route_desc = COALESCE($4, route_desc),
          route_type = COALESCE($5, route_type),
          route_url = COALESCE($6, route_url),
          route_color = COALESCE($7, route_color),
          route_text_color = COALESCE($8, route_text_color),
          route_sort_order = COALESCE($9, route_sort_order),
          continuous_pickup = COALESCE($10, continuous_pickup),
          continuous_drop_off = COALESCE($11, continuous_drop_off),
          network_id = COALESCE($12, network_id)
        WHERE route_id = $13
      `,
        [
          route.agency_id ?? null,
          route.route_short_name ?? null,
          route.route_long_name ?? null,
          route.route_desc ?? null,
          route.route_type ?? null,
          route.route_url ?? null,
          route.route_color ?? null,
          route.route_text_color ?? null,
          route.route_sort_order ?? null,
          route.continuous_pickup ?? null,
          route.continuous_drop_off ?? null,
          route.network_id ?? null,
          id,
        ],
      );

      return await this.findOne(id);
    }
  }

  async search(query: string): Promise<GtfsSearchResponseItem[]> {
    const ql = `
      SELECT
        json_build_object(
          'route_id', routes.route_id,
          'agency_id', routes.agency_id,
          'route_short_name', routes.route_short_name,
          'route_long_name', routes.route_long_name,
          'route_desc', routes.route_desc,
          'route_type', routes.route_type,
          'route_url', routes.route_url,
          'route_color', routes.route_color,
          'route_text_color', routes.route_text_color
        ) as route,
        similarity(route_short_name, $1) AS score
      FROM
        routes
      ORDER BY
        score DESC
      LIMIT 10
    `;
    return await this.routesRepository.query(ql, [query]);
  }
}
