import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User, UserRole } from '../auth/entities/user.entity';
import {
  Changeset,
  ChangesetStatus,
} from '../changeset/entities/changeset.entity';
import {
  Change,
  ChangeOperation,
  EntityType,
} from '../changeset/entities/change.entity';
import { Agency } from '../gtfs/agency/agency.entity';
import { Calendar } from '../gtfs/calendar/calendar.entity';
import {
  CalendarDate,
  ExceptionType,
} from '../gtfs/calendar_dates/calendar-date.entity';
import { Route } from '../gtfs/routes/route.entity';
import { Shape } from '../gtfs/shapes/shape.entity';
import {
  DropOffType,
  PickupType,
  StopTime,
} from '../gtfs/stop_times/stop-time.entity';
import { LocationType, Stop } from '../gtfs/stops/stop.entity';
import {
  BikesAllowed,
  Trip,
  WheelchairAccessible,
} from '../gtfs/trips/trip.entity';

@Injectable()
export class DbSyncService {
  private readonly logger = new Logger(DbSyncService.name);

  constructor(
    private dataSource: DataSource,
    @InjectRepository(Agency)
    private agencyRepository: Repository<Agency>,
    @InjectRepository(Stop)
    private stopRepository: Repository<Stop>,
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(StopTime)
    private stopTimeRepository: Repository<StopTime>,
    @InjectRepository(Calendar)
    private calendarRepository: Repository<Calendar>,
    @InjectRepository(CalendarDate)
    private calendarDateRepository: Repository<CalendarDate>,
    @InjectRepository(Shape)
    private shapeRepository: Repository<Shape>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Changeset)
    private changesetRepository: Repository<Changeset>,
    @InjectRepository(Change)
    private changeRepository: Repository<Change>,
  ) {}

  private getColumnDefinitions(
    entity: any,
  ): { name: string; type: string; nullable: boolean }[] {
    const metadata = this.dataSource.getMetadata(entity);
    return metadata.columns.map((column) => {
      let type = 'varchar';

      if (column.type === 'uuid') {
        type = 'uuid';
      } else if (column.type === 'int' || column.type === 'integer') {
        type = 'integer';
      } else if (column.type === 'decimal' || column.type === 'float') {
        type = 'decimal';
      } else if (column.type === 'boolean') {
        type = 'boolean';
      } else if (column.type === 'date') {
        type = 'date';
      } else if (column.type === 'timestamp') {
        type = 'timestamp';
      } else if (column.type === 'enum') {
        type = column.enumName || 'varchar';
      } else if (column.type === 'simple-array') {
        type = (column.enumName || 'varchar') + '[]';
      }

      return {
        name: column.databaseName,
        type,
        nullable: column.isNullable || false,
      };
    });
  }

  async syncAllEntities(): Promise<void> {
    this.logger.log('Starting database synchronization...');

    // Sync enums first
    await this.syncEnums();

    await this.syncAgency();
    await this.syncStops();
    await this.syncRoutes();
    await this.syncTrips();
    await this.syncStopTimes();
    await this.syncCalendar();
    await this.syncCalendarDates();
    await this.syncShapes();
    await this.syncUsers();

    // Sync changeset tables (must be after users for foreign key)
    await this.syncChangesets();
    await this.syncChanges();

    this.logger.log('Database synchronization completed');
  }

  async installPgExtensions(): Promise<void> {
    this.logger.log('Installing PostgreSQL extensions...');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    await queryRunner.release();
    this.logger.log('PostgreSQL extensions installed successfully');
  }

  private async syncEnums(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const enumDefinitions = [
        {
          name: 'role_enum',
          values: Object.values(UserRole),
        },
        {
          name: 'exception_type_enum',
          values: Object.values(ExceptionType),
        },
        {
          name: 'route_type_enum',
          values: [0, 1, 2, 3, 4, 5, 6, 7, 800, 900],
        },
        {
          name: 'wheelchair_accessible_enum',
          values: Object.values(WheelchairAccessible),
        },
        {
          name: 'bikes_allowed_enum',
          values: Object.values(BikesAllowed),
        },
        {
          name: 'location_type_enum',
          values: Object.values(LocationType),
        },
        {
          name: 'pickup_type_enum',
          values: Object.values(PickupType),
        },
        {
          name: 'drop_off_type_enum',
          values: Object.values(DropOffType),
        },
        // Changeset enums
        {
          name: 'changeset_status_enum',
          values: Object.values(ChangesetStatus),
        },
        {
          name: 'entity_type_enum',
          values: Object.values(EntityType),
        },
        {
          name: 'change_operation_enum',
          values: Object.values(ChangeOperation),
        },
      ];

      for (const enumDef of enumDefinitions) {
        await queryRunner.query(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${enumDef.name}') THEN
              CREATE TYPE ${enumDef.name} AS ENUM (${enumDef.values.map((v) => `'${v}'`).join(', ')});
            ELSE
              DROP TYPE ${enumDef.name} CASCADE;
              CREATE TYPE ${enumDef.name} AS ENUM (${enumDef.values.map((v) => `'${v}'`).join(', ')});
            END IF;
          END $$;
        `);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error syncing enum types:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async syncAgency(): Promise<void> {
    const tableName = 'agency';
    const columns = this.getColumnDefinitions(Agency);
    await this.syncTable(tableName, columns);
  }

  private async syncStops(): Promise<void> {
    const tableName = 'stops';
    const columns = this.getColumnDefinitions(Stop);
    await this.syncTable(tableName, columns);
  }

  private async syncRoutes(): Promise<void> {
    const tableName = 'routes';
    const columns = this.getColumnDefinitions(Route);
    await this.syncTable(tableName, columns);
  }

  private async syncTrips(): Promise<void> {
    const tableName = 'trips';
    const columns = this.getColumnDefinitions(Trip);
    await this.syncTable(tableName, columns);
  }

  private async syncStopTimes(): Promise<void> {
    const tableName = 'stop_times';
    const columns = this.getColumnDefinitions(StopTime);
    await this.syncTable(tableName, columns);
  }

  private async syncCalendar(): Promise<void> {
    const tableName = 'calendar';
    const columns = this.getColumnDefinitions(Calendar);
    await this.syncTable(tableName, columns);
  }

  private async syncCalendarDates(): Promise<void> {
    const tableName = 'calendar_dates';
    const columns = this.getColumnDefinitions(CalendarDate);
    await this.syncTable(tableName, columns);
  }

  private async syncShapes(): Promise<void> {
    const tableName = 'shapes';
    const columns = this.getColumnDefinitions(Shape);
    await this.syncTable(tableName, columns);
  }

  private async syncUsers(): Promise<void> {
    const tableName = 'users';
    const columns = this.getColumnDefinitions(User);
    await this.syncTable(tableName, columns);
  }

  private async syncChangesets(): Promise<void> {
    const tableName = 'changesets';
    const columns = this.getColumnDefinitions(Changeset);
    await this.syncTable(tableName, columns);
  }

  private async syncChanges(): Promise<void> {
    const tableName = 'changes';
    const columns = this.getColumnDefinitions(Change);
    await this.syncTable(tableName, columns);
  }

  private async syncTable(
    tableName: string,
    columns: { name: string; type: string; nullable: boolean }[],
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if table exists
      const tableExists = await queryRunner.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `,
        [tableName],
      );

      if (!tableExists[0].exists) {
        this.logger.log(`Creating table ${tableName}`);
        // Create table with all columns
        const columnDefinitions = columns
          .map((col) => {
            const isPrimaryKey = col.name === columns[0].name;
            const nullable = col.nullable ? '' : 'NOT NULL';
            return `${col.name} ${col.type} ${isPrimaryKey ? 'PRIMARY KEY' : ''} ${nullable}`;
          })
          .join(',\n');

        await queryRunner.query(`
          CREATE TABLE ${tableName} (
            ${columnDefinitions}
          )
        `);
      } else {
        // Get existing columns
        const existingColumns = await queryRunner.query(
          `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = $1
        `,
          [tableName],
        );

        const existingColumnNames = existingColumns.map(
          (col) => col.column_name,
        );

        // Add missing columns and update constraints
        for (const column of columns) {
          if (!existingColumnNames.includes(column.name)) {
            this.logger.log(
              `Adding column ${column.name} to table ${tableName}`,
            );
            const nullable = column.nullable ? 'NULL' : 'NOT NULL';
            await queryRunner.query(`
              ALTER TABLE ${tableName} 
              ADD COLUMN ${column.name} ${column.type} ${nullable}
            `);
          } else {
            // Update NOT NULL constraint if needed
            const existingColumn = existingColumns.find(
              (col) => col.column_name === column.name,
            );
            const currentNullable = existingColumn.is_nullable === 'YES';
            if (currentNullable !== column.nullable) {
              this.logger.log(
                `Updating NULL constraint for table ${tableName} column ${column.name}`,
              );
              const nullable = column.nullable
                ? 'DROP NOT NULL'
                : 'SET NOT NULL';
              await queryRunner.query(`
                ALTER TABLE ${tableName} 
                ALTER COLUMN ${column.name} ${nullable}
              `);
            }
          }
        }

        // Ensure primary key constraint exists
        const primaryKeyExists = await queryRunner.query(
          `
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_name = $1
            AND constraint_type = 'PRIMARY KEY'
          )
        `,
          [tableName],
        );

        if (!primaryKeyExists[0].exists) {
          this.logger.log(`Adding primary key constraint to ${tableName}`);
          await queryRunner.query(`
            ALTER TABLE ${tableName}
            ADD PRIMARY KEY (${columns[0].name})
          `);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error syncing table ${tableName}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
