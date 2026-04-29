const express = require('express');
const db = require('../db');
const crypto = require('crypto');

const router = express.Router();

// POST /api/attendance/start
router.post('/start', async (req, res) => {
  const { timetableId } = req.body;
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if session already exists for today
    let sessionRes = await db.query(
      'SELECT * FROM active_sessions WHERE timetable_id = $1 AND date = $2',
      [timetableId, today]
    );

    let session;
    if (sessionRes.rows.length > 0) {
      session = sessionRes.rows[0];
      if (!session.is_active) {
        // reactivate if it was ended earlier today, or just keep it active
        sessionRes = await db.query(
          'UPDATE active_sessions SET is_active = true WHERE id = $1 RETURNING *',
          [session.id]
        );
        session = sessionRes.rows[0];
      }
    } else {
      // Create new session
      const secretKey = crypto.randomBytes(32).toString('hex');
      sessionRes = await db.query(
        'INSERT INTO active_sessions (timetable_id, date, secret_key, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
        [timetableId, today, secretKey, true]
      );
      session = sessionRes.rows[0];
    }

    res.json({
      sessionId: session.id,
      secretKey: session.secret_key
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/attendance/end
router.post('/end', async (req, res) => {
  const { sessionId } = req.body;
  try {
    await db.query('UPDATE active_sessions SET is_active = false WHERE id = $1', [sessionId]);
    res.json({ message: 'Session ended successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/attendance/session/:sessionId
router.get('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const sessionRes = await db.query(
      `SELECT a.id, a.is_active, a.secret_key, t.start_time, t.end_time, s.name as subject_name, c.department, c.year, c.section, cr.name as room_name
       FROM active_sessions a
       JOIN timetables t ON a.timetable_id = t.id
       JOIN subjects s ON t.subject_id = s.id
       JOIN classes c ON t.class_id = c.id
       LEFT JOIN classrooms cr ON t.classroom_id = cr.id
       WHERE a.id = $1`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Also fetch current attendance count
    const countRes = await db.query('SELECT COUNT(*) FROM attendance_records WHERE session_id = $1', [sessionId]);

    res.json({
      ...sessionRes.rows[0],
      attendanceCount: parseInt(countRes.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const jwt = require('jsonwebtoken');

// Memory cache to prevent token reuse
const usedTokens = new Set();
// Clean up cache every minute to prevent memory leak
setInterval(() => usedTokens.clear(), 60000);

// GET /api/attendance/token/:sessionId
router.get('/token/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const sessionRes = await db.query('SELECT secret_key, is_active FROM active_sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0 || !sessionRes.rows[0].is_active) {
      return res.status(400).json({ error: 'Invalid or inactive session' });
    }
    
    // Generate a unique token expiring in precisely 3 seconds
    const token = jwt.sign(
      { sessionId, timestamp: Date.now() }, 
      sessionRes.rows[0].secret_key, 
      { expiresIn: '3s' }
    );
    
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/attendance/mark
router.post('/mark', async (req, res) => {
  const { token, studentId, deviceId } = req.body;
  try {
    // 1. Check if token was already used (Reuse Prevention - Screenshot/Replay attack)
    if (usedTokens.has(token)) {
      return res.status(400).json({ error: 'QR Code already used. Please scan the latest code.' });
    }

    const decoded = jwt.decode(token);
    if (!decoded || !decoded.sessionId) {
      return res.status(400).json({ error: 'Invalid QR Code structure.' });
    }

    const sessionId = decoded.sessionId;

    // 1.5 One Scan Per Student Check
    const existingRecord = await db.query('SELECT id FROM attendance_records WHERE session_id = $1 AND student_id = $2', [sessionId, studentId]);
    if (existingRecord.rows.length > 0) {
      return res.status(400).json({ error: 'Attendance already marked for this session.' });
    }

    // 2. Fetch the session and verify student class membership & device validation
    const sessionRes = await db.query(`
      SELECT a.secret_key, a.is_active, t.class_id, cs.student_id as is_enrolled, sp.device_id
      FROM active_sessions a
      JOIN timetables t ON a.timetable_id = t.id
      LEFT JOIN class_students cs ON t.class_id = cs.class_id AND cs.student_id = $2
      LEFT JOIN student_profiles sp ON sp.user_id = $2
      WHERE a.id = $1
    `, [sessionId, studentId]);

    if (sessionRes.rows.length === 0) {
      return res.status(400).json({ error: 'Session not found.' });
    }
    
    if (!sessionRes.rows[0].is_active) {
      return res.status(400).json({ error: 'Session is no longer active.' });
    }

    if (!sessionRes.rows[0].is_enrolled) {
      return res.status(403).json({ error: 'You are not enrolled in this class.' });
    }

    // 3. Device Validation (Anti-Proxy)
    let registeredDeviceId = sessionRes.rows[0].device_id;
    if (!registeredDeviceId) {
      // First time scanning, register this device to the student
      await db.query('UPDATE student_profiles SET device_id = $1 WHERE user_id = $2', [deviceId, studentId]);
    } else if (registeredDeviceId !== deviceId) {
      // Trying to scan with a different device
      return res.status(403).json({ error: 'Device mismatch. You must scan from your registered primary device.' });
    }

    const secretKey = sessionRes.rows[0].secret_key;

    // 4. Verify token mathematically and check expiration (3 second expiry - Time Validation)
    try {
      jwt.verify(token, secretKey);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(400).json({ error: 'QR Code expired. Scan the newest one.' });
      }
      return res.status(400).json({ error: 'Invalid QR Code signature.' });
    }

    // 5. Mark token as used
    usedTokens.add(token);

    // 6. Mark attendance in DB
    await db.query(
      'INSERT INTO attendance_records (session_id, student_id, status) VALUES ($1, $2, $3) ON CONFLICT (session_id, student_id) DO NOTHING',
      [sessionId, studentId, 'present']
    );

    res.json({ message: 'Attendance marked successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/attendance/faculty/:facultyId/sessions
router.get('/faculty/:facultyId/sessions', async (req, res) => {
  const { facultyId } = req.params;
  try {
    const sessions = await db.query(`
      SELECT a.id, a.date, a.is_active, t.start_time, t.end_time, s.name as subject_name, c.department, c.year, c.section
      FROM active_sessions a
      JOIN timetables t ON a.timetable_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      JOIN classes c ON t.class_id = c.id
      WHERE t.faculty_id = $1
      ORDER BY a.date DESC, t.start_time DESC
    `, [facultyId]);
    res.json(sessions.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/attendance/session/:sessionId/report
router.get('/session/:sessionId/report', async (req, res) => {
  const { sessionId } = req.params;
  try {
    // Get class ID for this session
    const sessionRes = await db.query(`
      SELECT t.class_id, s.name as subject_name, a.date
      FROM active_sessions a
      JOIN timetables t ON a.timetable_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      WHERE a.id = $1
    `, [sessionId]);

    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const classId = sessionRes.rows[0].class_id;

    // Get all enrolled students and left join with attendance records
    const reportRes = await db.query(`
      SELECT u.id, u.name, u.email, sp.register_number,
             CASE WHEN ar.id IS NOT NULL THEN 'Present' ELSE 'Absent' END as status
      FROM class_students cs
      JOIN users u ON cs.student_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN attendance_records ar ON ar.session_id = $1 AND ar.student_id = u.id
      WHERE cs.class_id = $2
      ORDER BY sp.register_number ASC
    `, [sessionId, classId]);

    res.json({
      meta: sessionRes.rows[0],
      students: reportRes.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/attendance/student/:studentId/stats
router.get('/student/:studentId/stats', async (req, res) => {
  const { studentId } = req.params;
  try {
    // 1. Subject-wise stats
    const statsRes = await db.query(`
      SELECT 
          s.id as subject_id,
          s.name as subject_name,
          COUNT(a.id) as total_classes_held,
          COUNT(ar.id) as classes_attended
      FROM class_students cs
      JOIN timetables t ON cs.class_id = t.class_id
      JOIN subjects s ON t.subject_id = s.id
      JOIN active_sessions a ON a.timetable_id = t.id
      LEFT JOIN attendance_records ar ON ar.session_id = a.id AND ar.student_id = cs.student_id
      WHERE cs.student_id = $1
      GROUP BY s.id, s.name
    `, [studentId]);

    const subjects = statsRes.rows.map(row => {
      const held = parseInt(row.total_classes_held);
      const attended = parseInt(row.classes_attended);
      return {
        ...row,
        total_classes_held: held,
        classes_attended: attended,
        percentage: held === 0 ? 100 : Math.round((attended / held) * 100)
      };
    });

    let totalHeld = 0, totalAttended = 0;
    subjects.forEach(s => {
      totalHeld += s.total_classes_held;
      totalAttended += s.classes_attended;
    });
    const overallPercentage = totalHeld === 0 ? 100 : Math.round((totalAttended / totalHeld) * 100);

    // 2. Recent History
    const historyRes = await db.query(`
      SELECT 
          s.name as subject_name,
          a.date,
          t.start_time,
          CASE WHEN ar.id IS NOT NULL THEN 'Present' ELSE 'Absent' END as status
      FROM class_students cs
      JOIN timetables t ON cs.class_id = t.class_id
      JOIN subjects s ON t.subject_id = s.id
      JOIN active_sessions a ON a.timetable_id = t.id
      LEFT JOIN attendance_records ar ON ar.session_id = a.id AND ar.student_id = cs.student_id
      WHERE cs.student_id = $1
      ORDER BY a.date DESC, t.start_time DESC
      LIMIT 10
    `, [studentId]);

    res.json({
      overallPercentage,
      totalHeld,
      totalAttended,
      subjects,
      history: historyRes.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
