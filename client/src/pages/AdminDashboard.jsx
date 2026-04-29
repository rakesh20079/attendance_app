import React, { useState, useEffect } from 'react';
import { Building, BookOpen, Users, MapPin, PlusCircle, CheckCircle, Clock, Activity } from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('departments');
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState('');
  const [data, setData] = useState({ departments: [], subjects: [], classes: [], classrooms: [], faculty: [], students: [] });
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    fetchData();
    fetchAnalytics();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/data');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) { console.error(e); }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/analytics');
      if (res.ok) {
        setAnalyticsData(await res.json());
      }
    } catch (e) { console.error(e); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e, endpoint) => {
    e.preventDefault();
    setMessage('');
    
    let payload = { ...formData };
    
    if (endpoint === 'auth/register/faculty') {
      if (payload.subjectsHandled) {
        payload.subjectsHandled = payload.subjectsHandled.split(',').map(s => s.trim()).filter(s => s);
      }
      if (payload.assignedClasses) {
        payload.assignedClasses = payload.assignedClasses.split(';').map(c => {
          const parts = c.split(',');
          return { dept: parts[0]?.trim(), year: parseInt(parts[1]?.trim() || 1), section: parts[2]?.trim() };
        });
      }
    }
    
    try {
      const res = await fetch(`http://localhost:5000/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setMessage('Successfully added/assigned!');
        setFormData({});
        fetchData();
      } else {
        const err = await res.json();
        setMessage('Error: ' + err.error);
      }
    } catch (err) {
      setMessage('Network error');
    }
  };

  const renderForm = () => {
    switch(activeTab) {
      case 'departments':
        return (
          <form onSubmit={(e) => handleSubmit(e, 'admin/departments')}>
            <h4>Add Department</h4>
            <input className="form-control mb-2" name="name" placeholder="Department Name (e.g. Computer Science)" onChange={handleChange} required />
            <input className="form-control mb-2" name="code" placeholder="Code (e.g. CS)" onChange={handleChange} required />
            <button className="btn btn-primary w-100 mt-2">Add Department</button>
          </form>
        );
      case 'courses':
        return (
          <form onSubmit={(e) => handleSubmit(e, 'admin/courses')}>
            <h4>Add Course (Subject)</h4>
            <input className="form-control mb-2" name="name" placeholder="Course Name" onChange={handleChange} required />
            <input className="form-control mb-2" name="code" placeholder="Course Code" onChange={handleChange} required />
            <button className="btn btn-primary w-100 mt-2">Add Course</button>
          </form>
        );
      case 'sections':
        return (
          <form onSubmit={(e) => handleSubmit(e, 'admin/sections')}>
            <h4>Add Section / Class</h4>
            <select className="form-control mb-2" name="department" onChange={handleChange} required>
              <option value="">Select Department</option>
              {data.departments.map(d => <option key={d.id} value={d.code}>{d.name}</option>)}
            </select>
            <input className="form-control mb-2" name="year" type="number" placeholder="Year (e.g. 1)" onChange={handleChange} required />
            <input className="form-control mb-2" name="section" placeholder="Section (e.g. A)" onChange={handleChange} required />
            <button className="btn btn-primary w-100 mt-2">Add Section</button>
          </form>
        );
      case 'classrooms':
        return (
          <form onSubmit={(e) => handleSubmit(e, 'admin/classrooms')}>
            <h4>Add Classroom</h4>
            <input className="form-control mb-2" name="name" placeholder="Room Name (e.g. Room 101)" onChange={handleChange} required />
            <input className="form-control mb-2" name="capacity" type="number" placeholder="Capacity" onChange={handleChange} required />
            <button className="btn btn-primary w-100 mt-2">Add Classroom</button>
          </form>
        );
      case 'assign-faculty':
        return (
          <form onSubmit={(e) => handleSubmit(e, 'admin/assign-faculty')}>
            <h4>Assign Faculty to Subject/Class</h4>
            <select className="form-control mb-2" name="facultyId" onChange={handleChange} required>
              <option value="">Select Faculty</option>
              {data.faculty.map(f => <option key={f.id} value={f.id}>{f.name} ({f.faculty_id_number})</option>)}
            </select>
            <select className="form-control mb-2" name="subjectId" onChange={handleChange}>
              <option value="">Select Subject (Optional)</option>
              {data.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="form-control mb-2" name="classId" onChange={handleChange}>
              <option value="">Select Class (Optional)</option>
              {data.classes.map(c => <option key={c.id} value={c.id}>{c.department} - Yr {c.year} - Sec {c.section}</option>)}
            </select>
            <button className="btn btn-primary w-100 mt-2">Assign Faculty</button>
          </form>
        );
      case 'assign-student':
        return (
          <form onSubmit={(e) => handleSubmit(e, 'admin/assign-student')}>
            <h4>Assign Student to Class</h4>
            <select className="form-control mb-2" name="studentId" onChange={handleChange} required>
              <option value="">Select Student</option>
              {data.students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.register_number})</option>)}
            </select>
            <select className="form-control mb-2" name="classId" onChange={handleChange} required>
              <option value="">Select Class</option>
              {data.classes.map(c => <option key={c.id} value={c.id}>{c.department} - Yr {c.year} - Sec {c.section}</option>)}
            </select>
            <button className="btn btn-primary w-100 mt-2">Assign Student</button>
          </form>
        );
      case 'users':
        return (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <form onSubmit={(e) => handleSubmit(e, 'auth/register/student')} style={{ flex: 1, padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <h4>Add Student</h4>
              <input className="form-control mb-2" name="name" placeholder="Full Name" onChange={handleChange} required />
              <input className="form-control mb-2" type="email" name="email" placeholder="Email" onChange={handleChange} required />
              <input className="form-control mb-2" type="password" name="password" placeholder="Password" onChange={handleChange} required />
              <input className="form-control mb-2" name="registerNumber" placeholder="Register Number" onChange={handleChange} required />
              <input className="form-control mb-2" name="department" placeholder="Department (e.g. CS)" onChange={handleChange} required />
              <input className="form-control mb-2" name="year" type="number" placeholder="Year" onChange={handleChange} required />
              <input className="form-control mb-2" name="section" placeholder="Section (e.g. A)" onChange={handleChange} required />
              <button className="btn btn-primary w-100 mt-2">Add Student</button>
            </form>

            <form onSubmit={(e) => handleSubmit(e, 'auth/register/faculty')} style={{ flex: 1, padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <h4>Add Faculty</h4>
              <input className="form-control mb-2" name="name" placeholder="Full Name" onChange={handleChange} required />
              <input className="form-control mb-2" type="email" name="email" placeholder="Email" onChange={handleChange} required />
              <input className="form-control mb-2" type="password" name="password" placeholder="Password" onChange={handleChange} required />
              <input className="form-control mb-2" name="facultyId" placeholder="Faculty ID" onChange={handleChange} required />
              <input className="form-control mb-2" name="department" placeholder="Department (e.g. CS)" onChange={handleChange} required />
              <input className="form-control mb-2" name="subjectsHandled" placeholder="Subjects (comma separated)" onChange={handleChange} required />
              <input className="form-control mb-2" name="assignedClasses" placeholder="Classes (Dept,Yr,Sec)" onChange={handleChange} required />
              <button className="btn btn-primary w-100 mt-2">Add Faculty</button>
            </form>
          </div>
        );
      case 'timetable':
        return (
          <form onSubmit={(e) => handleSubmit(e, 'timetable')}>
            <h4>Create Weekly Timetable Entry</h4>
            <select className="form-control mb-2" name="classId" onChange={handleChange} required>
              <option value="">Select Class</option>
              {data.classes.map(c => <option key={c.id} value={c.id}>{c.department} - Yr {c.year} - Sec {c.section}</option>)}
            </select>
            <select className="form-control mb-2" name="subjectId" onChange={handleChange} required>
              <option value="">Select Subject</option>
              {data.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="form-control mb-2" name="facultyId" onChange={handleChange} required>
              <option value="">Select Faculty</option>
              {data.faculty.map(f => <option key={f.id} value={f.id}>{f.name} ({f.faculty_id_number})</option>)}
            </select>
            <select className="form-control mb-2" name="classroomId" onChange={handleChange}>
              <option value="">Select Classroom (Optional)</option>
              {data.classrooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select className="form-control mb-2" name="dayOfWeek" onChange={handleChange} required>
              <option value="">Select Day</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
            </select>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="text-muted text-sm">Start Time</label>
                <input className="form-control mb-2" type="time" name="startTime" onChange={handleChange} required />
              </div>
              <div style={{ flex: 1 }}>
                <label className="text-muted text-sm">End Time</label>
                <input className="form-control mb-2" type="time" name="endTime" onChange={handleChange} required />
              </div>
            </div>
            <button className="btn btn-primary w-100 mt-2">Create Timetable Entry</button>
          </form>
        );
      case 'analytics':
        return (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Global Analytics Overview</h3>
              <button className="btn btn-outline" onClick={() => {
                // Export logic for analytics
                if (!analyticsData) return;
                let csvContent = "data:text/csv;charset=utf-8,";
                csvContent += "Type,Department,Year,Section,Subject,Total Sessions,Enrolled Students,Percentage\n";
                analyticsData.classes.forEach(c => {
                  csvContent += `Class,${c.department},${c.year},${c.section},${c.subject_name},${c.total_sessions},${c.enrolled_students},${c.percentage}%\n`;
                });
                csvContent += "\nType,Student Name,Register Number,Email,Classes Attended,Classes Held,Percentage\n";
                analyticsData.alerts.forEach(a => {
                  csvContent += `Alert,${a.name},${a.register_number},${a.email},${a.classes_attended},${a.total_classes_held},${a.percentage}%\n`;
                });
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `Global_Analytics_Report.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>Export Report (CSV)</button>
            </div>
            
            {!analyticsData ? <p>Loading analytics...</p> : (
              <>
                <div className="dashboard-grid mb-4">
                  {analyticsData.departments.map((d, i) => (
                    <div key={i} className="stat-card" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                      <div className="title">{d.department} Department</div>
                      <div className="value" style={{ fontSize: '1.5rem' }}>{d.total_sessions} Sessions</div>
                      <p className="text-muted text-sm m-0 mt-1">{d.total_attendances} total student check-ins</p>
                    </div>
                  ))}
                </div>

                <div className="dashboard-grid">
                  <div className="glass-panel" style={{ flex: 2 }}>
                    <h4 className="mb-3">Class Attendance Reports</h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '0.5rem' }}>Class</th>
                            <th style={{ padding: '0.5rem' }}>Subject</th>
                            <th style={{ padding: '0.5rem' }}>Sessions</th>
                            <th style={{ padding: '0.5rem' }}>Attendance %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.classes.map((c, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.5rem' }}>{c.department}-{c.year}{c.section}</td>
                              <td style={{ padding: '0.5rem' }}>{c.subject_name}</td>
                              <td style={{ padding: '0.5rem' }}>{c.total_sessions}</td>
                              <td style={{ padding: '0.5rem' }}>
                                <span style={{ color: c.percentage >= 75 ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 'bold' }}>
                                  {c.percentage}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ flex: 1, border: '1px solid var(--danger-color)' }}>
                    <h4 className="mb-3 text-danger">Low Attendance Alerts</h4>
                    {analyticsData.alerts.length === 0 ? <p className="text-muted">No students at risk.</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {analyticsData.alerts.map((a, i) => (
                          <div key={i} style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong>{a.name}</strong>
                              <span className="text-danger fw-bold">{a.percentage}%</span>
                            </div>
                            <div className="text-muted text-sm">{a.register_number} | {a.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      default: return null;
    }
  };

  const tabs = [
    { id: 'departments', icon: Building, label: 'Departments' },
    { id: 'courses', icon: BookOpen, label: 'Courses' },
    { id: 'sections', icon: Users, label: 'Sections' },
    { id: 'classrooms', icon: MapPin, label: 'Classrooms' },
    { id: 'users', icon: PlusCircle, label: 'Add Users' },
    { id: 'assign-faculty', icon: CheckCircle, label: 'Assign Faculty' },
    { id: 'assign-student', icon: CheckCircle, label: 'Assign Student' },
    { id: 'timetable', icon: Clock, label: 'Manage Timetable' },
    { id: 'analytics', icon: Activity, label: 'Analytics' }
  ];

  return (
    <div className="animate-fade-in">
      <header className="mb-4">
        <h1>Admin Dashboard</h1>
        <p className="text-muted">Manage university resources, staff, and students.</p>
      </header>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Sidebar Tabs */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button 
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMessage(''); }}
                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ justifyContent: 'flex-start', width: '100%', padding: '1rem' }}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1 }}>
          <div className="glass-panel">
            {message && (
              <div style={{ padding: '1rem', backgroundColor: message.includes('Error') ? 'var(--danger-color)' : 'var(--success-color)', color: '#fff', borderRadius: '8px', marginBottom: '1rem' }}>
                {message}
              </div>
            )}
            {renderForm()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
