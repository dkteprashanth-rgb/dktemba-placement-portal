
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  Users,
  BriefcaseBusiness,
  FileSpreadsheet,
  Search,
  Save,
  GraduationCap,
  Trash2,
} from 'lucide-react';
import ExcelJS from 'exceljs';

import { supabase } from '../lib/supabase';


// =====================================================
// 1. REUSABLE ADMIN HEADER
// =====================================================

function Header({ title, desc, action }) {
  return (
    <div className="admin-header">
      <div>
        <span className="eyebrow">PLACEMENT CELL</span>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>

      {action}
    </div>
  );
}


// =====================================================
// 2. ADMIN DATA HOOK
// =====================================================

function useAdminData() {
  const [jobs, setJobs] = useState([]);
  const [students, setStudents] = useState([]);
  const [applications, setApplications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [jobsResult, studentsResult, applicationsResult] =
        await Promise.all([
          supabase
            .from('jobs')
            .select(
              'id, company_name, opening_title, status, deadline, created_at'
            )
            .order('created_at', { ascending: false }),

          supabase
            .from('student_profiles')
            .select(
              'id, prn, full_name, email, mobile, graduation_stream, created_at'
            ),

          supabase
            .from('applications')
            .select(`
              id,
              status,
              created_at,
              job:jobs(company_name, opening_title),
              student:student_profiles(prn, full_name)
            `)
            .order('created_at', { ascending: false }),
        ]);

      if (jobsResult.error) throw jobsResult.error;
      if (studentsResult.error) throw studentsResult.error;
      if (applicationsResult.error) throw applicationsResult.error;

      setJobs(jobsResult.data || []);
      setStudents(studentsResult.data || []);
      setApplications(applicationsResult.data || []);
    } catch (error) {
      console.error('Admin data loading failed:', error);
      setError(error.message || 'Unable to load admin data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return {
    jobs,
    students,
    applications,
    loading,
    error,
    refresh,
  };
}


// =====================================================
// 3. ADMIN LOGIN
// =====================================================

export function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }

      // Authenticate administrator
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) throw loginError;

      // Verify administrator role
      const { data: admin, error: adminError } = await supabase
        .from('admin_users')
        .select('auth_user_id, role')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (adminError) throw adminError;

      if (!admin) {
        await supabase.auth.signOut();
        throw new Error(
          'You are not authorized to access the admin dashboard.'
        );
      }

      // Successful admin login
      navigate('/admin', { replace: true });

    } catch (error) {
      console.error('Admin login failed:', error);
      setError(error.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-single">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">PLACEMENT CELL ADMIN</span>

        <h2>Admin sign in</h2>

        <p className="muted">
          Use your authorized administrator account.
        </p>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <label>
          Email

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter administrator email"
            autoComplete="username"
            required
          />
        </label>

        <label>
          Password

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            required
          />
        </label>

        <button
          className="btn btn-primary full"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}


// =====================================================
// 4. ADMIN DASHBOARD
// =====================================================

export function AdminDashboard() {
  const d = useAdminData();

  return (
    <>
      <Header
        title="Overview"
        desc="Monitor placement activity across the portal."
      />

      {d.error && (
        <div className="form-error">{d.error}</div>
      )}

      <div className="stats-grid admin-stats">

        <div className="stat-card">
          <span>Total students registered</span>
          <b>{d.students.length}</b>
          <Users />
        </div>

        <div className="stat-card">
          <span>Job openings</span>
          <b>{d.jobs.length}</b>
          <BriefcaseBusiness />
        </div>

        <div className="stat-card">
          <span>Applications received</span>
          <b>{d.applications.length}</b>
          <FileSpreadsheet />
        </div>

      </div>

      <div className="admin-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent openings</h2>
            <p>Latest jobs created in the portal.</p>
          </div>

          <Link
            className="btn btn-primary"
            to="/admin/jobs/new"
          >
            <Plus size={16} />
            Create opening
          </Link>
        </div>

        {d.loading ? (
          <p>Loading...</p>
        ) : d.jobs.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Opening</th>
                  <th>Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {d.jobs.slice(0, 6).map((job) => (
                  <tr key={job.id}>
                    <td>{job.company_name}</td>
                    <td>{job.opening_title}</td>
                    <td>{job.deadline || '—'}</td>
                    <td>
                      <span className="status-pill">
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            No openings created yet.
          </p>
        )}
      </div>
    </>
  );
}


// =====================================================
// 5. MANAGE JOB OPENINGS
// =====================================================

export function AdminJobs() {
  const d = useAdminData();
  const [deletingId, setDeletingId] = useState('');
  const [actionError, setActionError] = useState('');

  async function deleteOpening(job) {
    const label = `${job.company_name}${job.opening_title ? ` — ${job.opening_title}` : ''}`;
    const confirmed = window.confirm(
      `Delete the opening “${label}”? This will also permanently delete its positions, eligibility criteria, and applications. Student profiles will not be deleted.`
    );
    if (!confirmed) return;

    setDeletingId(job.id);
    setActionError('');
    try {
      // Use one database transaction so related records are not left partially deleted.
      const { error } = await supabase.rpc('delete_job_opening', {
        p_job_id: job.id,
      });
      if (error) throw error;

      await d.refresh();
    } catch (error) {
      console.error('Opening deletion failed:', error);
      setActionError(error.message || 'Unable to delete this opening.');
    } finally {
      setDeletingId('');
    }
  }

  return (
    <>
      <Header
        title="Job openings"
        desc="Create, publish and manage placement opportunities."
        action={
          <Link className="btn btn-primary" to="/admin/jobs/new">
            <Plus size={16} />
            New opening
          </Link>
        }
      />

      {d.error && <div className="form-error">{d.error}</div>}
      {actionError && <div className="form-error">{actionError}</div>}

      <div className="admin-panel">
        {d.loading ? (
          <p>Loading...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Opening</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {d.jobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.company_name}</td>
                    <td>{job.opening_title || '—'}</td>
                    <td>{job.deadline || '—'}</td>
                    <td><span className="status-pill">{job.status}</span></td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={deletingId === job.id}
                        onClick={() => deleteOpening(job)}
                        title="Permanently delete this opening and its related records"
                      >
                        <Trash2 size={15} />
                        {deletingId === job.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!d.jobs.length && <p className="muted">No job openings found.</p>}
          </div>
        )}
      </div>
    </>
  );
}


// =====================================================
// 6. CREATE JOB OPENING
// =====================================================

export function AdminCreateJob() {
  const [form, setForm] = useState({
    company_name: '',
    opening_title: '',
    salary_range: '',
    location: '',
    description: '',
    deadline: '',
    status: 'draft',
    positions: '',
  });

  // Enabled criteria are stored as individual rows. Disabled criteria are omitted.
  const [eligibility, setEligibility] = useState({
    tenth: { required: false, value: '' },
    twelfth: { required: false, value: '' },
    graduation: { required: false, percentage: '', cgpa: '' },
    mbaFy: { required: false, value: '' },
  });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function handleChange(e) {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  }

  async function save(e) {
    e.preventDefault();

    setBusy(true);
    setMessage('');

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }

      // Create job
      const { data: job, error } = await supabase
        .from('jobs')
        .insert({
          company_name: form.company_name,
          opening_title: form.opening_title.trim() || null,
          salary_range: form.salary_range,
          location: form.location,
          description: form.description,
          deadline: form.deadline || null,
          status: form.status,
        })
        .select()
        .single();

      if (error) throw error;

      // Add positions
      const positions = form.positions
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

      if (positions.length) {
        const result = await supabase
          .from('job_positions')
          .insert(
            positions.map((position_name) => ({
              job_id: job.id,
              position_name,
            }))
          );

        if (result.error) throw result.error;
      }

      // Save each enabled qualification using the actual database columns.
      // eligibility_criteria has minimum_percentage and minimum_cgpa;
      // it does not have marks_type or minimum_value columns.
      const criteria = [];

      // 10th and 12th are percentage-based; MBA FY is CGPA-based.
      for (const item of [
        { key: 'tenth', qualification: '10th', field: 'minimum_percentage', max: 100 },
        { key: 'twelfth', qualification: '12th', field: 'minimum_percentage', max: 100 },
        { key: 'mbaFy', qualification: 'mba_fy', field: 'minimum_cgpa' },
      ]) {
        if (!eligibility[item.key].required) continue;
        const rawValue = String(eligibility[item.key].value).trim();
        const value = Number(rawValue);
        if (!rawValue || !Number.isFinite(value) || value <= 0 || (item.max && value > item.max)) {
          throw new Error(`Enter a valid minimum ${item.field === 'minimum_cgpa' ? 'CGPA' : 'percentage'} for ${item.qualification}.`);
        }
        criteria.push({ job_id: job.id, qualification: item.qualification, [item.field]: value });
      }

      // Graduation accepts both university formats. Store both thresholds in
      // one row so the application checker can compare each student in their
      // own marks format without converting between percentage and CGPA.
      if (eligibility.graduation.required) {
        const percentageText = String(eligibility.graduation.percentage).trim();
        const cgpaText = String(eligibility.graduation.cgpa).trim();
        const minimumPercentage = percentageText === '' ? null : Number(percentageText);
        const minimumCgpa = cgpaText === '' ? null : Number(cgpaText);

        if (minimumPercentage === null && minimumCgpa === null) {
          throw new Error('Enter a minimum graduation percentage, CGPA, or both.');
        }
        if (minimumPercentage !== null && (!Number.isFinite(minimumPercentage) || minimumPercentage <= 0 || minimumPercentage > 100)) {
          throw new Error('Graduation minimum percentage must be greater than 0 and no more than 100.');
        }
        if (minimumCgpa !== null && (!Number.isFinite(minimumCgpa) || minimumCgpa <= 0)) {
          throw new Error('Graduation minimum CGPA must be greater than 0.');
        }

        criteria.push({
          job_id: job.id,
          qualification: 'graduation',
          minimum_percentage: minimumPercentage,
          minimum_cgpa: minimumCgpa,
        });
      }

      if (criteria.length) {
        const result = await supabase
          .from('eligibility_criteria')
          .insert(criteria);

        if (result.error) throw result.error;
      }

      setMessage('Opening saved successfully.');

      setForm({
        company_name: '',
        opening_title: '',
        salary_range: '',
        location: '',
        description: '',
        deadline: '',
        status: 'draft',
        positions: '',
      });

      setEligibility({
        tenth: { required: false, value: '' },
        twelfth: { required: false, value: '' },
        graduation: { required: false, percentage: '', cgpa: '' },
        mbaFy: { required: false, value: '' },
      });

    } catch (error) {
      console.error('Job creation failed:', error);
      setMessage(error.message || 'Unable to save opening.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header
        title="Create opening"
        desc="Add a company opportunity and configure its positions and eligibility."
      />

      <form
        className="admin-panel admin-form"
        onSubmit={save}
      >
        <div className="form-grid">

          <label>
            Company name
            <input
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Opening title <small>Optional — leave blank if the company is recruiting for multiple positions</small>
            <input
              name="opening_title"
              value={form.opening_title}
              onChange={handleChange}
              placeholder="e.g. Graduate Recruitment 2027"
            />
          </label>

          <label>
            Salary range
            <input
              name="salary_range"
              value={form.salary_range}
              onChange={handleChange}
              placeholder="e.g. 4–6 LPA"
            />
          </label>

          <label>
            Location
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
            />
          </label>

          <label>
            Application deadline
            <input
              type="date"
              name="deadline"
              value={form.deadline}
              onChange={handleChange}
            />
          </label>

          <label>
            Publishing status
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </label>

        </div>

        <label>
          Job description
          <textarea
            rows="5"
            name="description"
            value={form.description}
            onChange={handleChange}
          />
        </label>

        <label>
          Positions
          <small>One position per line</small>

          <textarea
            rows="3"
            name="positions"
            value={form.positions}
            onChange={handleChange}
            placeholder={'Business Analyst\nManagement Trainee'}
          />
        </label>

        <section
          className="eligibility-section"
          style={{
            marginTop: '8px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            background: '#fbfcfe',
          }}
        >
          <div style={{ marginBottom: '18px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>
              Academic eligibility requirements
            </h2>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '13px' }}>
              Set the minimum academic requirement specified by the company.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '14px',
            }}
          >
            {[
              { key: 'tenth', title: '10th marks', unit: 'Percentage', placeholder: 'e.g. 60' },
              { key: 'twelfth', title: '12th marks', unit: 'Percentage', placeholder: 'e.g. 60' },
              { key: 'graduation', title: 'Graduation marks', unit: 'Percentage or CGPA', placeholder: 'e.g. 60 or 6.0' },
              { key: 'mbaFy', title: 'MBA FY marks', unit: 'CGPA', placeholder: 'e.g. 6.0' },
            ].map((item) => (
              <div
                key={item.key}
                style={{
                  padding: '16px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  minWidth: 0,
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ display: 'block', color: '#172744', fontSize: '14px' }}>
                    {item.title}
                  </strong>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>
                    {item.unit}
                  </span>
                </div>

                <div
                  role="group"
                  aria-label={`${item.title} requirement`}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '14px',
                    marginBottom: eligibility[item.key].required ? '14px' : 0,
                  }}
                >
                  <label
                    style={{
                      display: 'inline-flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: '7px',
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <input
                      type="radio"
                      name={`${item.key}-required`}
                      checked={eligibility[item.key].required}
                      onChange={() => setEligibility((previous) => ({
                        ...previous,
                        [item.key]: { ...previous[item.key], required: true },
                      }))}
                      style={{ width: 'auto', margin: 0 }}
                    />
                    Required
                  </label>

                  <label
                    style={{
                      display: 'inline-flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: '7px',
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <input
                      type="radio"
                      name={`${item.key}-required`}
                      checked={!eligibility[item.key].required}
                      onChange={() => setEligibility((previous) => ({
                        ...previous,
                        [item.key]: { ...previous[item.key], required: false, value: '' },
                      }))}
                      style={{ width: 'auto', margin: 0 }}
                    />
                    Not required
                  </label>
                </div>

                {eligibility[item.key].required && (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {item.key === 'graduation' ? (
                      <>
                        <label style={{ display: 'block', margin: 0 }}>
                          <span style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
                            Minimum Percentage
                          </span>
                          <input
                            type="number"
                            min="0.01"
                            max="100"
                            step="0.01"
                            value={eligibility.graduation.percentage}
                            onChange={(e) => setEligibility((previous) => ({
                              ...previous,
                              graduation: { ...previous.graduation, percentage: e.target.value },
                            }))}
                            placeholder="e.g. 60"
                          />
                        </label>
                        <label style={{ display: 'block', margin: 0 }}>
                          <span style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
                            Minimum CGPA
                          </span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={eligibility.graduation.cgpa}
                            onChange={(e) => setEligibility((previous) => ({
                              ...previous,
                              graduation: { ...previous.graduation, cgpa: e.target.value },
                            }))}
                            placeholder="e.g. 6.0"
                          />
                        </label>
                        <small style={{ color: '#64748b', lineHeight: 1.5 }}>
                          Enter either or both. Students will be checked against the format used by their university; no automatic conversion is applied.
                        </small>
                      </>
                    ) : (
                      <label style={{ display: 'block', margin: 0 }}>
                        <span style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
                          Minimum {item.key === 'mbaFy' ? 'CGPA' : 'percentage'}
                        </span>
                        <input
                          type="number"
                          min="0.01"
                          max={item.key === 'mbaFy' ? undefined : 100}
                          step="0.01"
                          value={eligibility[item.key].value}
                          onChange={(e) => setEligibility((previous) => ({
                            ...previous,
                            [item.key]: { ...previous[item.key], value: e.target.value },
                          }))}
                          placeholder={item.placeholder}
                          required
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        {message && (
          <div className="notice">{message}</div>
        )}

        <button
          className="btn btn-primary"
          disabled={busy}
        >
          {busy ? 'Saving...' : 'Save opening'}
          <Save size={16} />
        </button>

      </form>
    </>
  );
}


// =====================================================
// 7. EXCEL EXPORT FUNCTION
// =====================================================

async function exportWorkbook(rows, filename) {
  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet('Applicants');

  worksheet.columns = [
    { header: 'PRN', key: 'prn', width: 16 },
    { header: 'Student Name', key: 'name', width: 25 },
    { header: 'Mobile', key: 'mobile', width: 16 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Graduation Stream', key: 'stream', width: 22 },
    { header: '10th %', key: 'tenth', width: 12 },
    { header: '12th %', key: 'twelfth', width: 12 },
    { header: 'Graduation Marks', key: 'graduation', width: 18 },
    { header: 'Graduation Type', key: 'graduation_type', width: 18 },
    { header: 'Graduation Maximum CGPA', key: 'graduation_max_cgpa', width: 22 },
    { header: 'MBA FY CGPA', key: 'mba_fy', width: 15 },
    { header: 'Position', key: 'position', width: 22 },
    { header: 'Application Date', key: 'date', width: 20 },
    { header: 'Status', key: 'status', width: 16 },
  ];

  rows.forEach((row) => {
    // Academic information is stored in student_academic_records,
    // not in student_profiles. PostgREST may return a single object
    // or an array for the nested relationship, so support both.
    const academic = Array.isArray(row.student?.academic)
      ? row.student.academic[0] || {}
      : row.student?.academic || {};

    worksheet.addRow({
      prn: row.student?.prn,
      name: row.student?.full_name,
      mobile: row.student?.mobile,
      email: row.student?.email,
      address: row.student?.address,
      stream: row.student?.graduation_stream,
      tenth: academic.tenth_percentage,
      twelfth: academic.twelfth_percentage,
      graduation: academic.graduation_marks,
      graduation_type: academic.graduation_marks_type,
      graduation_max_cgpa: academic.graduation_max_cgpa,
      mba_fy: academic.mba_fy_cgpa,
      position: row.position?.position_name,
      date: row.created_at
        ? new Date(row.created_at).toLocaleString()
        : '',
      status: row.status,
    });
  });

  // Format header
  worksheet.getRow(1).font = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF172744' },
  };

  worksheet.views = [
    { state: 'frozen', ySplit: 1 },
  ];

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}


// =====================================================
// 8. APPLICANTS & EXCEL EXPORT
// =====================================================

export function AdminApplicants() {
  const [rows, setRows] = useState([]);
  const [jobs, setJobs] = useState([]);

  const [jobId, setJobId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }

      const [jobsResult, applicationsResult] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, company_name, opening_title')
          .order('created_at', { ascending: false }),

        supabase
          .from('applications')
          .select(`
            id,
            status,
            created_at,
            job_id,
            position_id,
            position:job_positions(id, position_name),
            student:student_profiles(
              prn,
              full_name,
              mobile,
              email,
              address,
              graduation_stream,
              academic:student_academic_records(
                tenth_percentage,
                twelfth_percentage,
                graduation_marks,
                graduation_marks_type,
                graduation_max_cgpa,
                mba_fy_cgpa
              )
            )
          `)
          .order('created_at', { ascending: false }),
      ]);

      if (jobsResult.error) throw jobsResult.error;
      if (applicationsResult.error) throw applicationsResult.error;

      setJobs(jobsResult.data || []);
      setRows(applicationsResult.data || []);

    } catch (error) {
      console.error('Applicants loading failed:', error);
      setError(error.message || 'Unable to load applicants.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((row) => {
    const student = row.student || {};

    const matchesJob = !jobId || row.job_id === jobId;
    const matchesPosition = !positionId || row.position_id === positionId;

    const searchText = `
      ${student.prn || ''}
      ${student.full_name || ''}
      ${student.email || ''}
    `.toLowerCase();

    return (
      matchesJob &&
      matchesPosition &&
      searchText.includes(search.toLowerCase())
    );
  });

  const availablePositions = Array.from(
    new Map(
      rows
        .filter((row) => !jobId || row.job_id === jobId)
        .filter((row) => row.position_id && row.position?.position_name)
        .map((row) => [row.position_id, row.position])
    ).entries()
  ).map(([id, position]) => ({ id, name: position.position_name }));

  return (
    <>
      <Header
        title="Applicants & exports"
        desc="Review applicants and prepare company-wise Excel sheets."
      />

      <div className="admin-panel">

        <div className="filters">

          <label className="search-field">
            <Search size={16} />

            <input
              placeholder="Search PRN, name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <select
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              setPositionId('');
            }}
          >
            <option value="">All openings</option>

            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.company_name} — {job.opening_title}
              </option>
            ))}
          </select>

          <select
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            disabled={!availablePositions.length}
          >
            <option value="">All positions</option>
            {availablePositions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>

          <button
            className="btn btn-primary"
            disabled={!filtered.length}
            onClick={() =>
              exportWorkbook(
                filtered,
                `placement-applicants-${jobId || 'all'}-${positionId || 'all-positions'}.xlsx`
              )
            }
          >
            <Download size={16} />
            Download Excel
          </button>

        </div>

        {error && (
          <div className="form-error">{error}</div>
        )}

        {loading ? (
          <p>Loading applicants...</p>
        ) : (
          <>
            <p className="muted">
              Showing {filtered.length} of {rows.length} applications.
            </p>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>PRN</th>
                    <th>Student</th>
                    <th>Company / opening</th>
                    <th>Position</th>
                    <th>Applied</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((row) => {
                    const job = jobs.find(
                      (item) => item.id === row.job_id
                    );

                    return (
                      <tr key={row.id}>
                        <td>{row.student?.prn || '—'}</td>

                        <td>{row.student?.full_name || '—'}</td>

                        <td>
                          {job?.company_name || '—'}
                          <small>
                            {job?.opening_title || ''}
                          </small>
                        </td>

                        <td>
                          {row.position?.position_name || '—'}
                        </td>

                        <td>
                          {new Date(row.created_at).toLocaleDateString()}
                        </td>

                        <td>
                          <span className="status-pill">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!filtered.length && (
                <p className="muted">
                  No applications found.
                </p>
              )}
            </div>
          </>
        )}

      </div>
    </>
  );
}


// =====================================================
// 9. STUDENT RECORDS
// =====================================================

export function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setMessage('');

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }

      const { data, error } = await supabase
        .from('student_profiles')
        .select(
          'id, prn, full_name, email, mobile, graduation_stream'
        )
        .order('full_name');

      if (error) throw error;

      setStudents(data || []);

    } catch (error) {
      console.error('Student loading failed:', error);
      setMessage(error.message || 'Unable to load students.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Header
        title="Student records"
        desc="View registered student profiles and approved PRNs."
      />

      <div className="admin-panel">
        <h2>Approved PRN master</h2>

        <p className="muted">
          Approved PRNs are generated through the SQL setup.
          Student profiles are created after successful registration.
        </p>

        <div className="notice">
          Do not upload sensitive student details into the approved PRN master.
        </div>

        {message && (
          <div className="form-error">{message}</div>
        )}
      </div>

      <div className="admin-panel">
        <h2>Registered students ({students.length})</h2>

        {loading ? (
          <p>Loading students...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PRN</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Graduation stream</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.prn}</td>
                    <td>{student.full_name}</td>
                    <td>{student.email}</td>
                    <td>{student.mobile}</td>
                    <td>{student.graduation_stream}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!students.length && (
              <p className="muted">
                No registered students found.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}


// =====================================================
// 10. PORTAL SETTINGS
// =====================================================

export function AdminSettings() {
  const [contacts, setContacts] = useState({
    tpo_mba: '',
    coordinator_one: '',
    coordinator_two: '',
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        if (!supabase) {
          throw new Error('Supabase is not configured.');
        }

        const { data, error } = await supabase
          .from('portal_settings')
          .select('key, value');

        if (error) throw error;

        const updated = {
          tpo_mba: '',
          coordinator_one: '',
          coordinator_two: '',
        };

        (data || []).forEach((item) => {
          if (item.key in updated) {
            updated[item.key] = item.value || '';
          }
        });

        setContacts(updated);

      } catch (error) {
        console.error('Settings loading failed:', error);
        setMessage(error.message || 'Unable to load settings.');
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  function handleChange(key, value) {
    setContacts((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function save() {
    setSaving(true);
    setMessage('');

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }

      const { error } = await supabase
        .from('portal_settings')
        .upsert(
          Object.entries(contacts).map(([key, value]) => ({
            key,
            value,
          }))
        );

      if (error) throw error;

      setMessage('Contact settings saved successfully.');

    } catch (error) {
      console.error('Settings saving failed:', error);
      setMessage(error.message || 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header
        title="Portal settings"
        desc="Maintain placement cell support contacts."
      />

      <div className="admin-panel admin-form">

        {loading ? (
          <p>Loading settings...</p>
        ) : (
          <>
            <label>
              TPO MBA contact

              <input
                value={contacts.tpo_mba}
                onChange={(e) =>
                  handleChange('tpo_mba', e.target.value)
                }
              />
            </label>

            <label>
              Student Placement Coordinator 1

              <input
                value={contacts.coordinator_one}
                onChange={(e) =>
                  handleChange('coordinator_one', e.target.value)
                }
              />
            </label>

            <label>
              Student Placement Coordinator 2

              <input
                value={contacts.coordinator_two}
                onChange={(e) =>
                  handleChange('coordinator_two', e.target.value)
                }
              />
            </label>

            {message && (
              <div className="notice">{message}</div>
            )}

            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </>
        )}

      </div>
    </>
  );
}
