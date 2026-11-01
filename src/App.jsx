
import React, { useEffect, useState } from 'react';

import {
  Routes,
  Route,
  Navigate,
  Link,
  NavLink,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import {
  GraduationCap,
  ArrowUpRight,
  BriefcaseBusiness,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  FileSpreadsheet,
  Users,
  Settings,
} from 'lucide-react';

import { supabase, isSupabaseConfigured } from './lib/supabase';
import { testSupabaseConnection } from './lib/testSupabase';
import { getSession, getMyProfile } from './lib/api';

import {
  Home,
  About,
  Help,
  Openings,
  JobDetails,
  Register,
  Login,
  StudentDashboard,
  MyApplications,
  ApplyForJob,
  NotFound,
} from './pages/PublicPages';

import {
  AdminLogin,
  AdminDashboard,
  AdminJobs,
  AdminCreateJob,
  AdminApplicants,
  AdminStudents,
  AdminSettings,
} from './admin/AdminPages';


// =====================================================
// 1. NAVIGATION BAR
// =====================================================

function Nav() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const nav = useNavigate();
  const location = useLocation();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Listen for authentication changes.
  useEffect(() => {
    if (!supabase) return;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session loading failed:', error);
        return;
      }

      setSession(data.session);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setIsAdmin(false);
      setOpen(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Identify whether the authenticated user is an administrator.
  useEffect(() => {
    let active = true;

    async function checkRole() {
      if (!session?.user?.id || !supabase) {
        setIsAdmin(false);
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);

      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('auth_user_id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (active) setIsAdmin(Boolean(data));
      } catch (error) {
        console.error('Admin role verification failed:', error);
        if (active) setIsAdmin(false);
      } finally {
        if (active) setRoleLoading(false);
      }
    }

    checkRole();

    return () => {
      active = false;
    };
  }, [session]);

  async function logout() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout failed:', error);
        return;
      }
    }

    setSession(null);
    setIsAdmin(false);
    setOpen(false);
    nav('/');
  }

  const closeMenu = () => setOpen(false);

  return (
    <header className="topbar">
      <Link className="brand" to="/" onClick={closeMenu}>
        <span className="brand-mark">
          <GraduationCap size={23} />
        </span>
        <span>
          <b>DKTE</b>
          <small>PLACEMENT PORTAL</small>
        </span>
      </Link>

      {/* Desktop navigation */}
      <nav className="nav-links desktop-nav" aria-label="Main navigation">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/about">About</NavLink>
        <NavLink to="/openings">Current Openings</NavLink>
        <NavLink to="/help">Help</NavLink>
        <a
          href="https://updateresume.vercel.app/"
          target="_blank"
          rel="noreferrer"
        >
          Resume Portal <ArrowUpRight size={14} />
        </a>

        {session ? (
          <>
            <Link
              className="nav-cta"
              to={roleLoading ? '#' : isAdmin ? '/admin' : '/student'}
            >
              {roleLoading
                ? 'Loading...'
                : isAdmin
                  ? 'Admin Dashboard'
                  : 'My Dashboard'}
            </Link>
            <button className="nav-logout" onClick={logout}>
              <LogOut size={15} />
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login">Student Login</NavLink>
            <NavLink to="/admin/login">Admin Login</NavLink>
            <Link className="nav-cta" to="/register">
              Create Account
            </Link>
          </>
        )}
      </nav>

      {/* Mobile menu trigger */}
      <button
        className={`mobile-menu ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        aria-controls="mobile-navigation-drawer"
        type="button"
      >
        <span className="menu-icon">
          <Menu size={22} />
        </span>
        <span className="close-icon">
          <X size={22} />
        </span>
      </button>

      {/* Mobile drawer and backdrop */}
      <div
        className={`mobile-drawer-backdrop ${open ? 'is-visible' : ''}`}
        onClick={closeMenu}
        aria-hidden={!open}
      />

      <nav
        id="mobile-navigation-drawer"
        className={`mobile-drawer ${open ? 'is-open' : ''}`}
        aria-label="Mobile navigation"
        aria-hidden={!open}
      >
        <div className="drawer-heading">
          <div>
            <span className="drawer-eyebrow">DKTE MANAGEMENT STUDIES</span>
            <h2>Explore portal</h2>
            <p>Navigate your placement journey.</p>
          </div>
          <button
            className="drawer-close"
            type="button"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="drawer-section-label">MAIN MENU</div>

        <NavLink to="/" end className="drawer-link" onClick={closeMenu}>
          <span className="drawer-link-icon"><LayoutDashboard size={19} /></span>
          <span>Home</span>
          <ArrowUpRight className="drawer-link-arrow" size={16} />
        </NavLink>
        <NavLink to="/about" className="drawer-link" onClick={closeMenu}>
          <span className="drawer-link-icon"><ShieldCheck size={19} /></span>
          <span>About</span>
          <ArrowUpRight className="drawer-link-arrow" size={16} />
        </NavLink>
        <NavLink to="/openings" className="drawer-link" onClick={closeMenu}>
          <span className="drawer-link-icon"><BriefcaseBusiness size={19} /></span>
          <span>Current Openings</span>
          <ArrowUpRight className="drawer-link-arrow" size={16} />
        </NavLink>
        <NavLink to="/help" className="drawer-link" onClick={closeMenu}>
          <span className="drawer-link-icon"><Users size={19} /></span>
          <span>Help & Support</span>
          <ArrowUpRight className="drawer-link-arrow" size={16} />
        </NavLink>

        <a
          className="drawer-link"
          href="https://updateresume.vercel.app/"
          target="_blank"
          rel="noreferrer"
          onClick={closeMenu}
        >
          <span className="drawer-link-icon"><FileSpreadsheet size={19} /></span>
          <span>Resume Portal</span>
          <ArrowUpRight className="drawer-link-arrow" size={16} />
        </a>

        <div className="drawer-divider" />

        {session ? (
          <>
            <Link
              className="drawer-primary-action"
              to={roleLoading ? '#' : isAdmin ? '/admin' : '/student'}
              onClick={closeMenu}
            >
              <LayoutDashboard size={18} />
              <span>
                {roleLoading ? 'Loading dashboard...' : isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
              </span>
              <ArrowUpRight size={17} />
            </Link>
            <button className="drawer-secondary-action" onClick={logout} type="button">
              <LogOut size={17} />
              Logout
            </button>
          </>
        ) : (
          <>
            <Link className="drawer-primary-action" to="/login" onClick={closeMenu}>
              <span>Student Login</span>
              <ArrowUpRight size={17} />
            </Link>
            <Link className="drawer-secondary-action" to="/admin/login" onClick={closeMenu}>
              <ShieldCheck size={17} />
              Admin Login
            </Link>
            <Link className="drawer-create-account" to="/register" onClick={closeMenu}>
              Create Student Account
            </Link>
          </>
        )}

        <div className="drawer-footer">
          <span>DKTE · Department of Management Studies</span>
          <span>Placement Cell Portal</span>
        </div>
      </nav>
    </header>
  );
}


// =====================================================
// 2. FOOTER
// =====================================================

function Footer() {
  return (
    <footer className="footer">

      <div>
        <b>DKTE Department of Management Studies</b>

        <p>
          Placement Cell Portal · Internal student placement platform
        </p>
      </div>

      <span>
        © {new Date().getFullYear()} DKTE
      </span>

    </footer>
  );
}


// =====================================================
// 3. PROTECTED ROUTES
// =====================================================

function Protected({ children, admin = false }) {
  const [state, setState] = useState('loading');

  useEffect(() => {
    let live = true;

    async function checkAccess() {
      try {
        if (!supabase) {
          throw new Error('Supabase is not configured.');
        }

        const session = await getSession();

        if (!live) return;

        // User must be logged in
        if (!session) {
          setState('no');
          return;
        }

        // Admin access verification
        if (admin) {
          const { data, error } = await supabase
            .from('admin_users')
            .select('auth_user_id')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          if (error) throw error;

          if (live) {
            setState(data ? 'yes' : 'no');
          }

          return;
        }

        // Student access verification
        const profile = await getMyProfile();

        if (!live) return;

        setState(profile ? 'yes' : 'no');

      } catch (error) {
        console.error('Access verification failed:', error);

        if (live) {
          setState('no');
        }
      }
    }

    checkAccess();

    return () => {
      live = false;
    };
  }, [admin]);

  if (state === 'loading') {
    return (
      <div className="loading">
        Checking access…
      </div>
    );
  }

  return state === 'yes' ? (
    children
  ) : (
    <Navigate
      to={admin ? '/admin/login' : '/login'}
      replace
    />
  );
}


// =====================================================
// 4. ADMIN LAYOUT
// =====================================================

function AdminShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const navItems = [
    ['/admin', 'Overview', LayoutDashboard],
    ['/admin/jobs', 'Job openings', BriefcaseBusiness],
    ['/admin/applicants', 'Applicants & exports', FileSpreadsheet],
    ['/admin/students', 'Student records', Users],
    ['/admin/settings', 'Settings', Settings],
  ];

  return (
    <div className="admin-layout">
      {/* Mobile admin toolbar */}
      <div className="admin-mobile-toolbar">
        <Link className="brand light" to="/">
          <span className="brand-mark"><GraduationCap size={21} /></span>
          <span>
            <b>DKTE</b>
            <small>ADMIN CONSOLE</small>
          </span>
        </Link>
        <button
          type="button"
          className={`admin-mobile-menu-button ${menuOpen ? 'is-open' : ''}`}
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={menuOpen ? 'Close admin navigation' : 'Open admin navigation'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        className={`admin-drawer-backdrop ${menuOpen ? 'is-visible' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />

      {/* Admin sidebar / mobile drawer */}
      <aside className={`admin-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <Link className="brand light admin-sidebar-brand" to="/" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><GraduationCap /></span>
          <span>
            <b>DKTE</b>
            <small>ADMIN CONSOLE</small>
          </span>
        </Link>

        <div className="side-label">WORKSPACE</div>

        {navItems.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            onClick={() => setMenuOpen(false)}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}

        <Link to="/" onClick={() => setMenuOpen(false)}>
          <ArrowUpRight size={17} />
          <span>View student portal</span>
        </Link>
      </aside>

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}


// =====================================================
// 5. MAIN APPLICATION
// =====================================================

export default function App() {

  // Test Supabase connection
  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.warn('Supabase is not configured.');
      return;
    }

    testSupabaseConnection();
  }, []);

  return (
    <>

      <Nav />

      <Routes>

        {/* =========================================
            PUBLIC PAGES
        ========================================= */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/about"
          element={<About />}
        />

        <Route
          path="/help"
          element={<Help />}
        />


        {/* =========================================
            STUDENT AUTHENTICATION
        ========================================= */}

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/login"
          element={<Login />}
        />


        {/* =========================================
            PROTECTED STUDENT PAGES
        ========================================= */}

        <Route
          path="/openings"
          element={
            <Protected>
              <Openings />
            </Protected>
          }
        />

        <Route
          path="/openings/:id"
          element={
            <Protected>
              <JobDetails />
            </Protected>
          }
        />

        <Route
          path="/openings/:id/apply"
          element={
            <Protected>
              <ApplyForJob />
            </Protected>
          }
        />

        <Route
          path="/student"
          element={
            <Protected>
              <StudentDashboard />
            </Protected>
          }
        />

        <Route
          path="/applications"
          element={
            <Protected>
              <MyApplications />
            </Protected>
          }
        />


        {/* =========================================
            ADMIN AUTHENTICATION
        ========================================= */}

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />


        {/* =========================================
            PROTECTED ADMIN PAGES
        ========================================= */}

        <Route
          path="/admin"
          element={
            <Protected admin>
              <AdminShell>
                <AdminDashboard />
              </AdminShell>
            </Protected>
          }
        />

        <Route
          path="/admin/jobs"
          element={
            <Protected admin>
              <AdminShell>
                <AdminJobs />
              </AdminShell>
            </Protected>
          }
        />

        <Route
          path="/admin/jobs/new"
          element={
            <Protected admin>
              <AdminShell>
                <AdminCreateJob />
              </AdminShell>
            </Protected>
          }
        />

        <Route
          path="/admin/applicants"
          element={
            <Protected admin>
              <AdminShell>
                <AdminApplicants />
              </AdminShell>
            </Protected>
          }
        />

        <Route
          path="/admin/students"
          element={
            <Protected admin>
              <AdminShell>
                <AdminStudents />
              </AdminShell>
            </Protected>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <Protected admin>
              <AdminShell>
                <AdminSettings />
              </AdminShell>
            </Protected>
          }
        />


        {/* =========================================
            FALLBACK PAGE
        ========================================= */}

        <Route
          path="*"
          element={<NotFound />}
        />

      </Routes>

      <Footer />

      {/* Supabase setup warning */}
      {!isSupabaseConfigured && (
        <div className="setup-banner">
          <ShieldCheck size={16} />

          Setup required: connect Supabase using{' '}
          <code>.env.local</code> before enabling live authentication and data.
        </div>
      )}

    </>
  );
}
