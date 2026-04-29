const express = require('express');
const db = require('../db');
const bcrypt = require('bcrypt');

const router = express.Router();

// Get all entities for dropdowns
router.get('/data', async (req, res) => {
  try {
    const departments = await db.query('SELECT * FROM departments');
    const subjects = await db.query('SELECT * FROM subjects');
    const classes = await db.query('SELECT * FROM classes');
    const classrooms = await db.query('SELECT * FROM classrooms');
    const faculty = await db.query("SELECT u.id, u.name, f.faculty_id_number, f.department FROM users u JOIN faculty_profiles f ON u.id = f.user_id WHERE u.role = 'faculty'");
    const students = await db.query("SELECT u.id, u.name, s.register_number, s.department FROM users u JOIN student_profiles s ON u.id = s.user_id WHERE u.role = 'student'");

    res.json({
      departments: departments.rows,
      subjects: subjects.rows,
      classes: classes.rows,
      classrooms: classrooms.rows,
      faculty: faculty.rows,
      students: students.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/departments', async (req, res) => {
  const { name, code } = req.body;
  try {
    const result = await db.query('INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING *', [name, code]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/courses', async (req, res) => {
  const { name, code } = req.body;
  try {
    const result = await db.query('INSERT INTO subjects (name, code) VALUES ($1, $2) RETURNING *', [name, code]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sections', async (req, res) => {
  const { department, year, section } = req.body;
  try {
    const result = await db.query('INSERT INTO classes (department, year, section) VALUES ($1, $2, $3) RETURNING *', [department, year, section]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/classrooms', async (req, res) => {
  const { name, capacity } = req.body;
  try {
    const result = await db.query('INSERT INTO classrooms (name, capacity) VALUES ($1, $2) RETURNING *', [name, capacity]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/assign-faculty', async (req, res) => {
  const { facultyId, subjectId, classId } = req.body;
  try {
    if (subjectId) {
      await db.query('INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [facultyId, subjectId]);
    }
    if (classId) {
      await db.query('INSERT INTO faculty_classes (faculty_id, class_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [facultyId, classId]);
    }
    res.json({ message: 'Assigned successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/assign-student', async (req, res) => {
  const { studentId, classId } = req.body;
  try {
    await db.query('INSERT INTO class_students (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [classId, studentId]);
    res.json({ message: 'Assigned successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
  try {
    // 1. Department Attendance Trends
    const deptRes = await db.query(`
      SELECT d.name as department,
             COUNT(DISTINCT a.id) as total_sessions,
             COUNT(ar.id) as total_attendances
      FROM departments d
      JOIN classes c ON c.department = d.code
      JOIN timetables t ON t.class_id = c.id
      JOIN active_sessions a ON a.timetable_id = t.id
      LEFT JOIN attendance_records ar ON ar.session_id = a.id
      GROUP BY d.name
    `);

    // 2. Class Attendance Reports
    const classRes = await db.query(`
      SELECT c.department, c.year, c.section, s.name as subject_name,
             COUNT(DISTINCT a.id) as total_sessions,
             COUNT(ar.id) as total_attendances,
             (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) as enrolled_students
      FROM classes c
      JOIN timetables t ON t.class_id = c.id
      JOIN subjects s ON t.subject_id = s.id
      JOIN active_sessions a ON a.timetable_id = t.id
      LEFT JOIN attendance_records ar ON ar.session_id = a.id
      GROUP BY c.id, c.department, c.year, c.section, s.name
    `);

    const classReports = classRes.rows.map(r => {
      const expected = parseInt(r.total_sessions) * parseInt(r.enrolled_students);
      const attended = parseInt(r.total_attendances);
      return {
        ...r,
        percentage: expected === 0 ? 100 : Math.round((attended / expected) * 100)
      };
    });

    // 3. Low Attendance Alerts (< 75%)
    const lowAttRes = await db.query(`
      SELECT u.name, sp.register_number, u.email,
             COUNT(DISTINCT a.id) as total_classes_held,
             COUNT(DISTINCT ar.session_id) as classes_attended
      FROM users u
      JOIN student_profiles sp ON u.id = sp.user_id
      JOIN class_students cs ON u.id = cs.student_id
      JOIN timetables t ON cs.class_id = t.class_id
      JOIN active_sessions a ON a.timetable_id = t.id
      LEFT JOIN attendance_records ar ON ar.session_id = a.id AND ar.student_id = u.id
      GROUP BY u.id, u.name, sp.register_number, u.email
      HAVING COUNT(DISTINCT a.id) > 0 
         AND (COUNT(DISTINCT ar.session_id)::float / COUNT(DISTINCT a.id)::float) < 0.75
    `);

    const alerts = lowAttRes.rows.map(r => ({
      ...r,
      percentage: Math.round((parseInt(r.classes_attended) / parseInt(r.total_classes_held)) * 100)
    }));

    res.json({
      departments: deptRes.rows,
      classes: classReports,
      alerts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
