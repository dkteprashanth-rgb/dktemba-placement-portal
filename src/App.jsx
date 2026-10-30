
import React, { useEffect, useState } from 'react';

import {
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
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

  // Listen for authentication changes
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

  // Identify whether the authenticated user is an administrator
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

        if (active) {
          setIsAdmin(Boolean(data));
        }
      } catch (error) {
        console.error('Admin role verification failed:', error);

        if (active) {
          setIsAdmin(false);
        }
      } finally {
        if (active) {
          setRoleLoading(false);
        }
      }
    }

    checkRole();

    return () => {
      active = false;
    };
  }, [session]);

  // Logout
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
    nav('/');
  }

  return (
    <header className="topbar">

      {/* Brand */}
      <Link className="brand" to="/">
        <span className="brand-mark">
          <GraduationCap size={23} />
        </span>

        <span>
          <b>DKTE</b>
          <small>PLACEMENT PORTAL</small>
        </span>
      </Link>

      {/* Mobile menu */}
      <button
        className="mobile-menu"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X /> : <Menu />}
      </button>

      {/* Navigation links */}
      <nav className={open ? 'nav-links show' : 'nav-links'}>

        <Link to="/" onClick={() => setOpen(false)}>
          Home
        </Link>

        <Link to="/about" onClick={() => setOpen(false)}>
          About
        </Link>

        <Link to="/openings" onClick={() => setOpen(false)}>
          Current Openings
        </Link>

        <Link to="/help" onClick={() => setOpen(false)}>
          Help
        </Link>

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
              onClick={() => setOpen(false)}
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
            <Link to="/login" onClick={() => setOpen(false)}>
              Student Login
            </Link>

            <Link to="/admin/login" onClick={() => setOpen(false)}>
              Admin Login
            </Link>

            <Link
              className="nav-cta"
              to="/register"
              onClick={() => setOpen(false)}
            >
              Create Account
            </Link>
          </>
        )}

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

  const navItems = [
    ['/admin', 'Overview', LayoutDashboard],
    ['/admin/jobs', 'Job openings', BriefcaseBusiness],
    ['/admin/applicants', 'Applicants & exports', FileSpreadsheet],
    ['/admin/students', 'Student records', Users],
    ['/admin/settings', 'Settings', Settings],
  ];

  return (
    <div className="admin-layout">

      {/* Sidebar */}
      <aside className="admin-sidebar">

        <Link className="brand light" to="/">
          <span className="brand-mark">
            <GraduationCap />
          </span>

          <span>
            <b>DKTE</b>
            <small>ADMIN CONSOLE</small>
          </span>
        </Link>

        <div className="side-label">
          WORKSPACE
        </div>

        {navItems.map(([to, label, Icon]) => (
          <Link key={to} to={to}>
            <Icon size={17} />
            {label}
          </Link>
        ))}

        <Link to="/">
          <ArrowUpRight size={17} />
          View student portal
        </Link>

      </aside>

      {/* Main content */}
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
