import { NavLink, Link } from "react-router-dom";
import { useState, useEffect } from "react";

import { useAuth } from "../lib/auth";

export default function Header() {
  const { isAuthed, authDisabled, profile, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`site-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-bg">
        <div className="scan-line"></div>
      </div>

      <div className="header-content">
        <div className="brand">
          <Link to="/" className="brand-link">
            <div className="brand-mark">
              <span className="brand-icon">⚡</span>
              <span className="brand-text">VC</span>
            </div>
            <div className="brand-info">
              <h1 className="brand-title">VIBE CODING</h1>
              <p className="brand-subtitle">// MEETUPS & HACK NIGHTS</p>
            </div>
          </Link>
        </div>

        <nav className="nav">
          <NavLink
            to="/"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">🔍</span>
            DISCOVER
          </NavLink>
          <NavLink
            to="/create"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">🚀</span>
            HOST
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">👤</span>
            PROFILE
          </NavLink>
        </nav>

        <div className="auth-section">
          {isAuthed ? (
            <div className="user-info">
              <div className="user-meta">
                <span className="user-role">{profile?.role?.toUpperCase() ?? "MEMBER"}</span>
                <span className="user-name">{profile?.display_name ?? "USER"}</span>
              </div>
              <div className="user-actions">
                {authDisabled && (
                  <span className="dev-badge">
                    <span className="pulse-dot"></span>
                    DEV MODE
                  </span>
                )}
                {!authDisabled && (
                  <button className="btn-secondary" onClick={() => signOut()}>
                    SIGN OUT
                  </button>
                )}
              </div>
            </div>
          ) : (
            <Link to="/auth" className="btn-primary">
              <span className="btn-icon">🔑</span>
              SIGN IN
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
