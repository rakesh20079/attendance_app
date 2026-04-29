import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  // Check auth state
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAuthenticated = !!token;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const navigateToDashboard = () => {
    if (!user) return navigate('/');
    if (user.role === 'admin') navigate('/admin');
    else if (user.role === 'faculty') navigate('/faculty');
    else navigate('/student');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <ShieldCheck size={28} color="var(--primary-gold)" />
        SecureAtt
      </Link>
      
      <div className="navbar-nav">
        {isAuthenticated ? (
          <>
            <button className="btn btn-ghost" onClick={navigateToDashboard}>
              <User size={20} /> Dashboard
            </button>
            <button className="btn btn-outline" onClick={handleLogout}>
              <LogOut size={20} /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost">Login</Link>
            <Link to="/signup" className="btn btn-primary">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
