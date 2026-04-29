const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Attendance platform backend is running' });
});

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const timetableRoutes = require('./routes/timetable');
const attendanceRoutes = require('./routes/attendance');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/attendance', attendanceRoutes);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
