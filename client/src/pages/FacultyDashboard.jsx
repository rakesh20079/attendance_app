import { QrCode, Play, Users, FileText, Calendar, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

const FacultyDashboard = () => {
  const [timetable, setTimetable] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionReport, setSelectedSessionReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [remindedClasses, setRemindedClasses] = useState(new Set());
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  useEffect(() => {
    if (user.id) {
      fetchTimetable();
      fetchSessions();
    }
  }, [user.id]);

  useEffect(() => {
    // Check for classes starting in the next 15 minutes
    const interval = setInterval(() => {
      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[now.getDay()];
      
      timetable.forEach(cls => {
        if (cls.day_of_week === today && !remindedClasses.has(cls.id)) {
          const [hours, minutes] = cls.start_time.split(':').map(Number);
          const startTime = new Date();
          startTime.setHours(hours, minutes, 0, 0);
          
          const diffMinutes = (startTime - now) / (1000 * 60);
          
          if (diffMinutes > 0 && diffMinutes <= 15) {
            toast(`Reminder: Your ${cls.subject_name} class starts in ${Math.round(diffMinutes)} minutes!`, {
              icon: '⏰',
              duration: 6000
            });
            setRemindedClasses(prev => new Set(prev).add(cls.id));
          }
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [timetable, remindedClasses]);

  const fetchTimetable = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/timetable/faculty/${user.id}`);
      if (res.ok) setTimetable(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/attendance/faculty/${user.id}/sessions`);
      if (res.ok) setSessions(await res.json());
    } catch (e) { console.error(e); }
  };

  const viewReport = async (sessionId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/attendance/session/${sessionId}/report`);
      if (res.ok) setSelectedSessionReport(await res.json());
    } catch (e) { console.error(e); }
  };

  const exportCSV = () => {
    if (!selectedSessionReport) return;
    const { meta, students } = selectedSessionReport;
    const headers = ['Register Number,Name,Status'];
    const rows = students.map(s => `${s.register_number},${s.name},${s.status}`);
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_${meta.subject_name}_${meta.date.split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[new Date().getDay()];
  const todaysClasses = timetable.filter(t => t.day_of_week === todayName);

  return (
    <div className="animate-fade-in">
      <header className="mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Faculty Dashboard</h1>
          <p className="text-muted">Manage your classes and generate attendance QR codes.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className={`btn ${activeTab === 'schedule' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('schedule')}>Schedule</button>
          <button className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('reports')}>Reports</button>
        </div>
      </header>

      {activeTab === 'schedule' && (
        <>
          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="title">Your Scheduled Classes (Weekly)</div>
              <div className="value">{timetable.length}</div>
            </div>
            <div className="stat-card">
              <div className="title">Classes Today</div>
              <div className="value">{todaysClasses.length}</div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="glass-panel" style={{ flex: '1' }}>
              <h3 className="mb-3">Today's Schedule ({todayName})</h3>
              {loading ? (
                <p className="text-muted">Loading schedule...</p>
              ) : todaysClasses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <Calendar size={48} className="text-muted mb-2 mx-auto" />
                  <p className="text-muted">No classes scheduled for today.</p>
                </div>
              ) : (
                todaysClasses.map(cls => (
                  <div key={cls.id} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0 }}>{cls.subject_name}</h4>
                        <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>
                          {cls.start_time.substring(0,5)} - {cls.end_time.substring(0,5)} | Room: {cls.classroom_name || 'TBA'} | Class: {cls.department}-{cls.year}{cls.section}
                        </p>
                      </div>
                      <button 
                        className="btn btn-primary pulse-animation" 
                        style={{ whiteSpace: 'nowrap' }}
                        onClick={async () => {
                          const res = await fetch('http://localhost:5000/api/attendance/start', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ timetableId: cls.id })
                          });
                          if (res.ok) {
                            const data = await res.json();
                            window.location.href = '/faculty/session/' + data.sessionId;
                          }
                        }}
                      >
                        <Play size={18} /> Start Session
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="glass-panel" style={{ flex: '1' }}>
              <h3 className="mb-3">Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button className="btn btn-outline" style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('reports')}>
                  <FileText size={18} /> View Attendance Reports
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'reports' && (
        <div className="dashboard-grid">
          <div className="glass-panel" style={{ flex: 1 }}>
            <h3 className="mb-3">Recent Sessions</h3>
            {sessions.length === 0 ? <p className="text-muted">No past sessions found.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sessions.map(s => (
                  <button 
                    key={s.id} 
                    className="btn btn-outline" 
                    style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%' }}
                    onClick={() => viewReport(s.id)}
                  >
                    <div>
                      <strong>{s.subject_name}</strong> ({s.department}-{s.year}{s.section})
                      <div className="text-sm text-muted">{new Date(s.date).toLocaleDateString()}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ flex: 2 }}>
            {selectedSessionReport ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Attendance Report</h3>
                    <p className="text-muted m-0">{selectedSessionReport.meta.subject_name} - {new Date(selectedSessionReport.meta.date).toLocaleDateString()}</p>
                  </div>
                  <button className="btn btn-primary" onClick={exportCSV}>
                    <Download size={18} /> Export CSV
                  </button>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Reg No.</th>
                      <th style={{ padding: '0.5rem' }}>Name</th>
                      <th style={{ padding: '0.5rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSessionReport.students.map(st => (
                      <tr key={st.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.5rem' }}>{st.register_number}</td>
                        <td style={{ padding: '0.5rem' }}>{st.name}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <span style={{ 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px', 
                            fontSize: '0.8rem',
                            backgroundColor: st.status === 'Present' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: st.status === 'Present' ? 'var(--success-color)' : 'var(--danger-color)'
                          }}>
                            {st.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                <FileText size={48} className="text-muted mx-auto mb-3" />
                <p className="text-muted">Select a session from the left to view its attendance report.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;
