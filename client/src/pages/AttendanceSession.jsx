import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { StopCircle, Users, CheckCircle } from 'lucide-react';

const AttendanceSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessionData();
    // Poll for attendance count updates
    const pollInterval = setInterval(fetchSessionData, 5000);
    return () => clearInterval(pollInterval);
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/attendance/session/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionData(data);
      } else {
        navigate('/faculty');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionData || !sessionData.is_active) return;

    let isMounted = true;

    const generateQR = async () => {
      try {
        // Fetch securely signed token from the backend (expires in 3s)
        const res = await fetch(`http://localhost:5000/api/attendance/token/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (isMounted) {
          const url = await QRCode.toDataURL(data.token, {
            width: 400,
            margin: 2,
            color: {
              dark: '#1e293b',
              light: '#ffffff'
            }
          });
          setQrCodeUrl(url);
        }
      } catch (err) {
        console.error('Error generating QR', err);
      }
    };

    generateQR();
    const interval = setInterval(generateQR, 3000); // Fetch new token every 3 seconds!

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionData, sessionId]);

  const handleEndSession = async () => {
    try {
      await fetch('http://localhost:5000/api/attendance/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      navigate('/faculty');
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="text-center mt-4">Loading session...</div>;
  if (!sessionData) return null;

  return (
    <div className="animate-fade-in text-center" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="mb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <h2>{sessionData.subject_name}</h2>
            <p className="text-muted">
              {sessionData.department}-{sessionData.year}{sessionData.section} | Room: {sessionData.room_name || 'TBA'}
            </p>
          </div>
          <div>
            {sessionData.is_active ? (
              <button className="btn btn-primary" style={{ backgroundColor: 'var(--danger-color)' }} onClick={handleEndSession}>
                <StopCircle size={20} /> End Session
              </button>
            ) : (
              <button className="btn btn-outline" disabled>
                <CheckCircle size={20} /> Session Ended
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="glass-panel" style={{ flex: 2 }}>
          <h3 className="mb-3">Scan to Mark Attendance</h3>
          {sessionData.is_active ? (
            <>
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Attendance QR Code" style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              ) : (
                <div style={{ width: 400, height: 400, background: '#e2e8f0', margin: '0 auto', borderRadius: '12px' }}></div>
              )}
              <p className="text-muted mt-3 pulse-animation" style={{ display: 'inline-block', padding: '0.5rem 1rem', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.1)' }}>
                QR Code refreshes every 3 seconds to prevent proxy attendance
              </p>
            </>
          ) : (
            <div style={{ padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              This attendance session has been closed.
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Users size={48} className="text-primary mx-auto mb-2" style={{ color: 'var(--primary-gold)' }} />
          <h3>Live Attendance</h3>
          <h1 style={{ fontSize: '4rem', color: 'var(--primary-gold)', margin: '1rem 0' }}>{sessionData.attendanceCount}</h1>
          <p className="text-muted">Students Marked Present</p>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSession;
