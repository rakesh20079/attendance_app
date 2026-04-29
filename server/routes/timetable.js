const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /api/timetable (Admin creates timetable entry)
router.post('/', async (req, res) => {
  const { classId, subjectId, facultyId, classroomId, dayOfWeek, startTime, endTime } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO timetables (class_id, subject_id, faculty_id, classroom_id, day_of_week, start_time, end_time) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [classId, subjectId, facultyId, classroomId, dayOfWeek, startTime, endTime]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/timetable/faculty/:facultyId (Get timetable for faculty)
router.get('/faculty/:facultyId', async (req, res) => {
  try {
    const { facultyId } = req.params;
    const result = await db.query(
      `SELECT t.id, t.day_of_week, t.start_time, t.end_time,
              c.department, c.year, c.section,
              s.name as subject_name,
              cr.name as classroom_name
       FROM timetables t
       JOIN classes c ON t.class_id = c.id
       JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN classrooms cr ON t.classroom_id = cr.id
       WHERE t.faculty_id = $1
       ORDER BY t.start_time`,
      [facultyId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
