import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import * as Archiver from 'archiver';
import * as PgCopyStreams from 'pg-copy-streams';
import { PassThrough } from 'stream';
import { DataSource } from 'typeorm';

import { formatInTimeZone } from 'date-fns-tz';
import { last, sortBy } from 'lodash';
import { AppConfig } from '../config/configuration';
import { Agency } from '../gtfs/agency/agency.entity';
import { Calendar } from '../gtfs/calendar/calendar.entity';
import { CalendarDate } from '../gtfs/calendar_dates/calendar-date.entity';
import { Route } from '../gtfs/routes/route.entity';
import { Shape } from '../gtfs/shapes/shape.entity';
import { StopTime } from '../gtfs/stop_times/stop-time.entity';
import { Stop } from '../gtfs/stops/stop.entity';
import { Trip } from '../gtfs/trips/trip.entity';

@Injectable()
export class GtfsExportService {
  private readonly logger = new Logger(GtfsExportService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName = 'transit-ink-gtfs-exports';

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    const region =
      process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';

    // Avoid flexible-checksums middleware that sets x-amz-decoded-content-length
    // to undefined for stream bodies, causing ERR_HTTP_INVALID_HEADER_VALUE.
    this.s3Client = new S3Client({
      region,
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
  }

  private quoteIdent(ident: string): string {
    return `"${ident.replace(/"/g, '""')}"`;
  }

  private getTableExpression(entity: Function): string {
    const metadata = this.dataSource.getMetadata(entity);
    const tablePath = metadata.tablePath || metadata.tableName;
    // tablePath may be "schema.table" - quote parts separately
    return tablePath
      .split('.')
      .map((part) => this.quoteIdent(part))
      .join('.');
  }

  private getCopyTo(): (query: string) => any {
    const copyTo = (PgCopyStreams as any).to;
    if (!copyTo) {
      throw new Error('pg-copy-streams ".to" export not available');
    }
    return copyTo;
  }

  /**
   * Runs every day at midnight IST.
   * The job is effectively enabled only in production.
   */
  @Cron('0 0 0 * * *', {
    timeZone: 'Asia/Kolkata',
  })
  async handleCron(): Promise<void> {
    const appConfig = this.configService.get<AppConfig>('app');

    if (!appConfig) {
      this.logger.error(
        'App configuration not available; skipping GTFS export',
      );
      return;
    }

    if (appConfig.nodeEnv !== 'production') {
      this.logger.debug(
        `Skipping GTFS export cron in non-production environment: ${appConfig.nodeEnv}`,
      );
      return;
    }

    this.logger.log('Starting scheduled GTFS export');

    try {
      await this.streamGtfsZipToS3();
      this.logger.log('GTFS export completed and uploaded to S3');
    } catch (error) {
      this.logger.error('Failed to export GTFS data', error as Error);
    }
  }

  /**
   * SELECT expression for COPY: booleans are cast to int so CSV gets 0/1 (GTFS-style).
   */
  private getCopySelectList(entity: Function): string {
    const metadata = this.dataSource.getMetadata(entity);
    const parts = metadata.columns
      .filter((col) => col.databaseName !== 'id')
      .map((col) => {
        const q = this.quoteIdent(col.databaseName);
        const isBoolean =
          col.type === Boolean ||
          col.type === 'boolean' ||
          (typeof col.type === 'string' &&
            col.type.toLowerCase() === 'boolean');
        if (isBoolean) {
          return `(${q}::int) AS ${q}`;
        }
        return q;
      });
    return parts.join(', ');
  }

  /**
   * Streams a GTFS ZIP to a writable stream (HTTP response, file, etc.)
   * using Postgres `COPY ... TO STDOUT` for speed and low memory usage.
   */
  async streamGtfsZip(
    writable: NodeJS.WritableStream,
    opts?: { limit?: number },
  ): Promise<void> {
    const createArchiver = (Archiver as any).default ?? Archiver;
    const archive = createArchiver('zip', { zlib: { level: 9 } });
    const copyTo = this.getCopyTo();

    let aborted = false;

    const abort = (reason: unknown) => {
      if (aborted) return;
      aborted = true;
      this.logger.warn(
        `GTFS export(stream): aborted (${String(
          (reason as any)?.message ?? reason,
        )})`,
      );
      try {
        (archive as any).abort?.();
      } catch {
        // ignore
      }
      try {
        (writable as any).destroy?.();
      } catch {
        // ignore
      }
    };

    writable.on('close', () => abort('writable closed'));
    writable.on('error', (err) => abort(err));
    archive.on('error', (err: unknown) => abort(err));

    archive.pipe(writable);

    const driver: any = (this.dataSource as any).driver;
    const pool: any = driver?.master ?? driver?.pool ?? driver?.client;
    if (!pool?.connect) {
      throw new Error('Postgres pool not available on TypeORM driver');
    }

    const pgClient = await pool.connect();

    const tables: { fileName: string; entity: Function }[] = [
      { fileName: 'agency.txt', entity: Agency },
      { fileName: 'stops.txt', entity: Stop },
      { fileName: 'routes.txt', entity: Route },
      { fileName: 'trips.txt', entity: Trip },
      { fileName: 'stop_times.txt', entity: StopTime },
      { fileName: 'calendar.txt', entity: Calendar },
      { fileName: 'calendar_dates.txt', entity: CalendarDate },
      { fileName: 'shapes.txt', entity: Shape },
    ];

    try {
      for (const table of tables) {
        if (aborted) break;

        const startedAt = Date.now();
        const selectList = this.getCopySelectList(table.entity);
        const tableExpr = this.getTableExpression(table.entity);

        const limit =
          typeof opts?.limit === 'number' &&
          Number.isFinite(opts.limit) &&
          opts.limit > 0
            ? Math.floor(opts.limit)
            : undefined;

        const limitClause = limit ? ` LIMIT ${limit}` : '';

        const copySql = `COPY (SELECT ${selectList} FROM ${tableExpr}${limitClause}) TO STDOUT WITH (FORMAT csv, HEADER true)`;

        this.logger.log(
          `GTFS export(stream): starting ${table.fileName} (${limit ? `limit ${limit}` : 'full table'})`,
        );

        const copyStream = pgClient.query(copyTo(copySql));
        archive.append(copyStream, { name: table.fileName });

        await new Promise<void>((resolve, reject) => {
          copyStream.once('end', resolve);
          copyStream.once('error', reject);
        });

        this.logger.log(
          `GTFS export(stream): finished ${table.fileName} in ${Date.now() - startedAt}ms`,
        );
      }
    } finally {
      try {
        pgClient.release?.();
      } catch {
        // ignore
      }
    }

    if (!aborted) {
      await archive.finalize();
    }
  }

  /**
   * Returns the public download URL for this instance's latest GTFS export in S3.
   * Lists objects with prefix "gtfs-export-{instanceId}" and picks the most recent by LastModified.
   */
  async getLatestExportDownloadUrl(): Promise<string | null> {
    const instanceId = process.env.INSTANCE_ID || 'default';
    const prefix = `gtfs-export-${instanceId}`;
    const baseUrl = process.env.GTFS_EXPORT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return null;
    }

    const list = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      }),
    );

    const contents = list.Contents ?? [];
    if (contents.length === 0) {
      return null;
    }

    const latest = last(sortBy(contents, 'LastModified'))!;

    if (!latest.Key || !latest.LastModified) {
      return null;
    }

    const url = `${baseUrl.replace(/\/$/, '')}/${latest.Key}`;

    return url;
  }

  /**
   * Streams a GTFS ZIP to S3 (used by the daily cron).
   */
  private async streamGtfsZipToS3(): Promise<void> {
    const instanceId = process.env.INSTANCE_ID || 'default';
    const datePart = formatInTimeZone(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
    const key = `gtfs-export-${instanceId}-${datePart}.zip`;

    this.logger.log(
      `Uploading GTFS export to S3 bucket "${this.bucketName}" with key "${key}"`,
    );

    const passThrough = new PassThrough();
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucketName,
        Key: key,
        Body: passThrough,
        ContentType: 'application/zip',
      },
    });
    const uploadDone = upload.done();

    await this.streamGtfsZip(passThrough);
    await uploadDone;
  }
}
