const db = require('./db');

async function alterTable() {
  try {
    await db.query('ALTER TABLE student_profiles ADD COLUMN device_id VARCHAR(255);');
    console.log('Added device_id column to student_profiles');
  } catch (error) {
    if (error.code === '42701') {
      console.log('device_id column already exists');
    } else {
      console.error(error);
    }
  } finally {
    process.exit(0);
  }
}

alterTable();
