import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', 
    // Student specific
    registerNumber: '', department: '', year: '1', section: 'A',
    // Faculty specific
    facultyId: '', subjectsHandled: '', assignedClasses: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    let endpoint = role === 'student' ? '/api/auth/register/student' : '/api/auth/register/faculty';
    
    let payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
    };

    if (role === 'student') {
      payload = { ...payload, registerNumber: formData.registerNumber, department: formData.department, year: parseInt(formData.year), section: formData.section };
    } else if (role === 'faculty') {
      // Mock parsing for subjects and classes from comma-separated input
      const subjects = formData.subjectsHandled.split(',').map(s => s.trim()).filter(s => s);
      const classesStr = formData.assignedClasses.split(';').map(c => c.trim()).filter(c => c);
      const classes = classesStr.map(c => {
        const parts = c.split(','); // e.g. "CS,2,A" -> dept, year, sec
        return { dept: parts[0], year: parseInt(parts[1]), section: parts[2] };
      });

      payload = { ...payload, facultyId: formData.facultyId, department: formData.department, subjectsHandled: subjects, assignedClasses: classes };
    } else {
      setError("Admin registration is not available via this portal.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ role: data.role }));
      
      if (data.role === 'admin') navigate('/admin');
      else if (data.role === 'faculty') navigate('/faculty');
      else navigate('/student');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '4rem auto' }}>
      <div className="glass-panel">
        <div className="text-center mb-4">
          <UserPlus size={40} className="text-gold mx-auto mb-2" style={{ margin: '0 auto' }} />
          <h2>Create Account</h2>
          <p className="text-muted">Join the platform as a Student or Faculty</p>
        </div>

        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        {success && <div style={{ color: 'var(--success-color)', marginBottom: '1rem', textAlign: 'center' }}>{success}</div>}

        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label className="form-label">I am a...</label>
            <select 
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" name="name" className="form-control" placeholder="Enter your full name" onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" name="email" className="form-control" placeholder="Enter your email" onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" name="password" className="form-control" placeholder="Create a password" onChange={handleChange} required />
          </div>

          {role === 'student' && (
            <>
              <div className="form-group">
                <label className="form-label">Register Number</label>
                <input type="text" name="registerNumber" className="form-control" placeholder="e.g. CS21045" onChange={handleChange} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Department</label>
                  <input type="text" name="department" className="form-control" placeholder="e.g. Computer Science" onChange={handleChange} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Year</label>
                  <select name="year" className="form-control" onChange={handleChange}>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Section</label>
                  <input type="text" name="section" className="form-control" placeholder="e.g. A" onChange={handleChange} required />
                </div>
              </div>
            </>
          )}

          {role === 'faculty' && (
            <>
              <div className="form-group">
                <label className="form-label">Faculty ID</label>
                <input type="text" name="facultyId" className="form-control" placeholder="e.g. FAC101" onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input type="text" name="department" className="form-control" placeholder="e.g. Computer Science" onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Subjects Handled (comma-separated)</label>
                <input type="text" name="subjectsHandled" className="form-control" placeholder="e.g. Database Systems, Cloud Computing" onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Classes (Format: Dept,Year,Sec; Dept,Year,Sec)</label>
                <input type="text" name="assignedClasses" className="form-control" placeholder="e.g. CS,2,A; IT,3,B" onChange={handleChange} required />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Register as {role === 'student' ? 'Student' : 'Faculty'}
          </button>
        </form>

        <div className="text-center mt-3">
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            Already have an account? <Link to="/login" className="text-gold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
