# GTFS Toolkit

A suite of Web applications and tools to make working with transit data easier.

This is the source code for applications deployed at https://transit.ink

Main components:

- Backend Server
- Tools
- Dashboard
- End-user Interface

### Documentation

### Getting started

- Create a `.env` file in `server`, `scripts`, `dashboard`, and `ui` folders with `.env.example` as reference.

Server code and scripts to work with [GTFS Dashboard](https://github.com/transit-ink/gtfs-dashboard) and [GTFS UI](https://github.com/transit-ink/gtfs-ui)

## Running the server

Swagger UI is available at

## Importing data from GTFS files to PostgresQL database

```
cd scripts
npm install
node import-gtfs.js ../gtfs/blr
```

#### Options

- `--clean`: Delete all existing data in tables before importing
- `--batch-size`: No. of records to insert at once in the DB query. Defaults to 1000.

## Data

- The GTFS files for BLR are taken from the [bmtc-gtfs](https://github.com/Vonter/bmtc-gtfs) repo by Vonter
