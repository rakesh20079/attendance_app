import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StudentScanner = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('scanning'); // scanning, success, error
  const [message, setMessage] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleScan = async (result) => {
    if (!result || status !== 'scanning') return;
    
    // Stop scanning once we detect a code
    setStatus('processing');
    
    const token = result[0]?.rawValue || result;

    // Device fingerprinting (simple localStorage UUID)
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      localStorage.setItem('deviceId', deviceId);
    }
    
    try {
      const res = await fetch('http://localhost:5000/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, studentId: user.id, deviceId })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStatus('success');
        toast.success(data.message || 'Attendance marked successfully!');
        setMessage(data.message || 'Attendance marked successfully!');
        setTimeout(() => navigate('/student'), 3000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to mark attendance.');
        setTimeout(() => setStatus('scanning'), 4000); // Reset after 4 seconds to try again
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error. Please try again.');
      setTimeout(() => setStatus('scanning'), 4000);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '0 auto' }}>
      <header className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/student')} style={{ padding: '0.5rem' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ margin: 0 }}>Scan QR Code</h2>
      </header>

      <div className="glass-panel text-center">
        {status === 'success' ? (
          <div style={{ padding: '3rem 1rem' }}>
            <CheckCircle size={64} style={{ color: 'var(--success-color)', margin: '0 auto 1rem auto' }} />
            <h3>Success!</h3>
            <p className="text-muted">{message}</p>
            <p className="text-muted text-sm mt-3">Redirecting to dashboard...</p>
          </div>
        ) : (
          <>
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--primary-gold)' }}>
              <Scanner
                onScan={handleScan}
                onError={(error) => console.error(error?.message)}
                constraints={{ facingMode: 'environment' }}
              />
            </div>
            
            {status === 'error' && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} />
                <span>{message}</span>
              </div>
            )}
            
            {status === 'processing' && (
              <div style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
                Verifying secure token...
              </div>
            )}
            
            {status === 'scanning' && (
              <p className="text-muted mt-3">
                Point your camera at the QR code displayed by your professor.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentScanner;
