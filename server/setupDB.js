const fs = require('fs');
const path = require('path');
const db = require('./db');

async function setupDatabase() {
  try {
    const sqlFile = path.join(__dirname, 'database.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Running database.sql to create tables...');
    await db.query(sql);
    console.log('Database tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error.message);
    process.exit(1);
  }
}

setupDatabase();
