import React from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Shield, Clock } from 'lucide-react';

const Landing = () => {
  return (
    <div className="animate-fade-in text-center mt-4">
      <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
        Next-Generation <span className="text-gold">Attendance</span>
      </h1>
      <p className="text-muted" style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
        Eliminate proxy attendance with dynamic, time-sensitive QR codes. A robust platform designed for modern universities.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '4rem' }}>
        <Link to="/signup" className="btn btn-primary btn-lg">Deploy Now</Link>
        <Link to="/login" className="btn btn-outline btn-lg">Sign In</Link>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel text-center">
          <QrCode size={48} className="text-gold mb-2 mx-auto" style={{ margin: '0 auto' }} />
          <h3>Dynamic QR</h3>
          <p className="text-muted">QR codes refresh every 3 seconds to prevent screenshot sharing.</p>
        </div>
        <div className="glass-panel text-center">
          <Shield size={48} className="text-gold mb-2 mx-auto" style={{ margin: '0 auto' }} />
          <h3>Anti-Proxy</h3>
          <p className="text-muted">Secure validation ensures only physically present students can mark attendance.</p>
        </div>
        <div className="glass-panel text-center">
          <Clock size={48} className="text-gold mb-2 mx-auto" style={{ margin: '0 auto' }} />
          <h3>Real-Time Tracking</h3>
          <p className="text-muted">Instant reporting for faculty and detailed analytics for admins.</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
