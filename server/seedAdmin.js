const bcrypt = require('bcrypt');
const db = require('./db');

async function seedAdmin() {
  const name = 'System Admin';
  const email = 'admin@university.edu';
  const password = 'adminpassword123';
  const role = 'admin';

  try {
    const checkAdmin = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkAdmin.rows.length > 0) {
      console.log('Admin already exists.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
      [name, email, hashedPassword, role]
    );

    console.log('Admin user seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
