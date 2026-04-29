import { QrCode, Book, Activity, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StudentDashboard = () => {
  const [stats, setStats] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (user.id) {
      fetch(`http://localhost:5000/api/attendance/student/${user.id}/stats`)
        .then(res => res.json())
        .then(data => {
          setStats(data);
          // Check for low attendance and warn
          const lowAtt = data.subjects.filter(s => s.percentage < 75 && s.total_classes_held > 0);
          if (lowAtt.length > 0) {
            toast.error(`Warning: Low attendance in ${lowAtt.length} subject(s)!`, {
              duration: 5000,
              icon: '⚠️'
            });
          }
        })
        .catch(console.error);
    }
  }, [user.id]);

  if (!stats) return <div className="text-center mt-5 text-muted">Loading dashboard...</div>;

  const lowAttendanceSubjects = stats.subjects.filter(s => s.percentage < 75 && s.total_classes_held > 0);

  return (
    <div className="animate-fade-in">
      <header className="mb-4">
        <h1>Welcome, {user.name}</h1>
        <p className="text-muted">Here is your attendance overview.</p>
      </header>

      {/* Low Attendance Alerts */}
      {lowAttendanceSubjects.length > 0 && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} />
            <strong style={{ fontSize: '1.1rem' }}>Low Attendance Alert!</strong>
          </div>
          <p style={{ margin: 0 }}>You are falling below the mandatory 75% threshold in the following subjects: {lowAttendanceSubjects.map(s => s.subject_name).join(', ')}. Please contact your faculty.</p>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', color: 'white' }}>
          <Activity size={48} style={{ opacity: 0.8 }} />
          <div>
            <div style={{ fontSize: '1rem', opacity: 0.9 }}>Overall Attendance</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stats.overallPercentage}%</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{stats.totalAttended} / {stats.totalHeld} Classes Attended</div>
          </div>
        </div>

        <div className="glass-panel text-center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <QrCode size={48} className="text-primary mx-auto mb-2" />
          <h3 className="mb-2">Mark Attendance</h3>
          <p className="text-muted mb-4 text-sm">Scan the dynamic QR code displayed by your faculty to mark your presence.</p>
          <button 
            className="btn btn-primary pulse-animation w-100" 
            onClick={() => window.location.href = '/student/scan'}
          >
            Open Scanner
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel" style={{ flex: 1 }}>
          <h3 className="mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Book size={20} className="text-primary" /> Subject-wise Attendance
          </h3>
          {stats.subjects.length === 0 ? <p className="text-muted">No classes scheduled yet.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {stats.subjects.map(sub => (
                <div key={sub.subject_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <strong>{sub.subject_name}</strong>
                    <span style={{ color: sub.percentage >= 75 ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 'bold' }}>
                      {sub.percentage}%
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${sub.percentage}%`, 
                      height: '100%', 
                      background: sub.percentage >= 75 ? 'var(--success-color)' : 'var(--danger-color)',
                      transition: 'width 1s ease-in-out'
                    }}></div>
                  </div>
                  <div className="text-muted text-sm mt-1 text-right">{sub.classes_attended} / {sub.total_classes_held} Classes</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ flex: 1 }}>
          <h3 className="mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} className="text-primary" /> Recent History
          </h3>
          {stats.history.length === 0 ? <p className="text-muted">No attendance records found.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {stats.history.map((record, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{record.subject_name}</h4>
                    <span className="text-muted text-sm">{new Date(record.date).toLocaleDateString()} | {record.start_time.substring(0,5)}</span>
                  </div>
                  <span style={{ 
                    padding: '0.3rem 0.6rem', 
                    borderRadius: '4px', 
                    fontSize: '0.85rem',
                    backgroundColor: record.status === 'Present' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: record.status === 'Present' ? 'var(--success-color)' : 'var(--danger-color)'
                  }}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
