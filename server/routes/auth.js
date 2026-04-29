const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
};

// POST /api/auth/register/student
router.post('/register/student', async (req, res) => {
  const { name, registerNumber, department, year, section, email, password } = req.body;
  
  try {
    // Check if user exists
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const regCheck = await db.query('SELECT * FROM student_profiles WHERE register_number = $1', [registerNumber]);
    if (regCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Register number already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert transaction
    await db.query('BEGIN');
    
    const userResult = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, role',
      [name, email, hashedPassword, 'student']
    );
    
    const userId = userResult.rows[0].id;
    
    await db.query(
      'INSERT INTO student_profiles (user_id, register_number, department, year, section) VALUES ($1, $2, $3, $4, $5)',
      [userId, registerNumber, department, year, section]
    );

    // Check if class exists, if not create it
    let classResult = await db.query('SELECT id FROM classes WHERE department = $1 AND year = $2 AND section = $3', [department, year, section]);
    let classId;
    
    if (classResult.rows.length === 0) {
      classResult = await db.query(
        'INSERT INTO classes (department, year, section) VALUES ($1, $2, $3) RETURNING id',
        [department, year, section]
      );
    }
    classId = classResult.rows[0].id;

    // Map student to class
    await db.query('INSERT INTO class_students (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [classId, userId]);

    await db.query('COMMIT');
    
    const token = generateToken(userResult.rows[0]);
    res.status(201).json({ token, role: 'student', message: 'Student registered successfully' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/register/faculty
router.post('/register/faculty', async (req, res) => {
  const { name, facultyId, department, subjectsHandled, assignedClasses, email, password } = req.body;
  
  try {
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const facCheck = await db.query('SELECT * FROM faculty_profiles WHERE faculty_id_number = $1', [facultyId]);
    if (facCheck.rows.length > 0) return res.status(400).json({ error: 'Faculty ID already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query('BEGIN');
    
    const userResult = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, role',
      [name, email, hashedPassword, 'faculty']
    );
    const userId = userResult.rows[0].id;
    
    await db.query(
      'INSERT INTO faculty_profiles (user_id, faculty_id_number, department) VALUES ($1, $2, $3)',
      [userId, facultyId, department]
    );

    // subjectsHandled is array of strings e.g. ["Math", "Physics"]
    if (subjectsHandled && Array.isArray(subjectsHandled)) {
      for (const subjectName of subjectsHandled) {
        let subRes = await db.query('SELECT id FROM subjects WHERE name = $1', [subjectName]);
        if (subRes.rows.length === 0) {
          subRes = await db.query('INSERT INTO subjects (name, code) VALUES ($1, $2) RETURNING id', [subjectName, subjectName.substring(0,4).toUpperCase() + Math.floor(Math.random()*1000)]);
        }
        await db.query('INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, subRes.rows[0].id]);
      }
    }

    // assignedClasses is array of objects e.g. [{dept: "CS", year: 2, section: "A"}]
    if (assignedClasses && Array.isArray(assignedClasses)) {
      for (const cls of assignedClasses) {
        let classRes = await db.query('SELECT id FROM classes WHERE department = $1 AND year = $2 AND section = $3', [cls.dept, cls.year, cls.section]);
        if (classRes.rows.length === 0) {
          classRes = await db.query('INSERT INTO classes (department, year, section) VALUES ($1, $2, $3) RETURNING id', [cls.dept, cls.year, cls.section]);
        }
        await db.query('INSERT INTO faculty_classes (faculty_id, class_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, classRes.rows[0].id]);
      }
    }

    await db.query('COMMIT');
    
    const token = generateToken(userResult.rows[0]);
    res.status(201).json({ token, role: 'faculty', message: 'Faculty registered successfully' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Faculty registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role !== role) {
      return res.status(403).json({ error: `Account exists but not as a ${role}` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({ token, role: user.role, name: user.name, id: user.id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/forgot-password (mock for now as email sending needs SMTP)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    // In a real app, generate a reset token and send email
    res.json({ message: 'Password reset link sent to your email (Mock)' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me (Get current user)
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = decoded;
    next();
  });
};

router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
