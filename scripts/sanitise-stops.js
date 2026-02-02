require('dotenv').config();
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Validate required environment variables
const requiredEnvVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`- ${varName}`));
  console.error(
    '\nPlease create a .env file with these variables. See .env.example for reference.'
  );
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('Running in DRY RUN mode - no changes will be made\n');
}

async function sanitiseStops() {
  const client = await pool.connect();
  
  try {
    console.log('Fetching unique stop names...\n');
    
    // Get list of unique stop_names that have more than one stop_id
    const uniqueNamesResult = await client.query(`
      SELECT stop_name, COUNT(*) as count
      FROM stops
      GROUP BY stop_name
      HAVING COUNT(*) > 1
      ORDER BY stop_name
    `);
    
    const stopNames = uniqueNamesResult.rows;
    console.log(`Found ${stopNames.length} stop names with multiple stops\n`);
    
    let totalUpdated = 0;
    
    for (const { stop_name, count } of stopNames) {
      // Get all stop_ids for this stop_name, ordered by stop_id
      const stopsResult = await client.query(
        `SELECT stop_id FROM stops WHERE stop_name = $1 ORDER BY stop_id`,
        [stop_name]
      );
      
      const stopIds = stopsResult.rows.map(row => row.stop_id);
      const parentStopId = stopIds[0]; // First stop_id becomes the parent
      const childStopIds = stopIds.slice(1); // Rest are children
      
      console.log(`Stop: "${stop_name}" (${count} occurrences)`);
      console.log(`  Parent: ${parentStopId}`);
      console.log(`  Children: ${childStopIds.join(', ')}`);
      
      if (!dryRun) {
        // Update all child stops to set parent_station
        const updateResult = await client.query(
          `UPDATE stops SET parent_station = $1 WHERE stop_id = ANY($2)`,
          [parentStopId, childStopIds]
        );
        
        console.log(`  Updated: ${updateResult.rowCount} stops\n`);
        totalUpdated += updateResult.rowCount;
      } else {
        console.log(`  Would update: ${childStopIds.length} stops\n`);
        totalUpdated += childStopIds.length;
      }
    }
    
    if (dryRun) {
      console.log(`\nDRY RUN complete. Would have updated ${totalUpdated} stops.`);
    } else {
      console.log(`\nSanitisation complete. Updated ${totalUpdated} stops.`);
    }
    
  } catch (error) {
    console.error('Error sanitising stops:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

sanitiseStops().catch(console.error);
