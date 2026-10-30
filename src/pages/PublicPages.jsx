import React,{useEffect,useState} from 'react';

import {Link,useNavigate,useParams} from 'react-router-dom';

import {ArrowRight,BriefcaseBusiness,CheckCircle2,GraduationCap,ShieldCheck,Users,Clock3,MapPin,IndianRupee,FileText,LockKeyhole} from 'lucide-react';

import {supabase} from '../lib/supabase';

import {getPublishedJobs,getMyApplications,getMyProfile,getSession} from '../lib/api';


function PageHead({eyebrow,title,desc}) {
return <div className="page-head">
<span className="eyebrow">{eyebrow}</span>
<h1>{title}</h1>{desc&&<p>{desc}</p>}</div>}
function Empty({title='No openings published yet',desc='New opportunities will appear here when the Placement Cell publishes them.'}) {
return <div className="empty-state">
<BriefcaseBusiness size={28}/>
<h3>{title}</h3>
<p>{desc}</p>
</div>}
function JobCard({job}) {
return <article className="job-card">
<div className="job-icon">
<BriefcaseBusiness/>
</div>
<div className="job-main">
<span className="job-company">{job.company_name}</span>
<h3>{job.opening_title}</h3>
<div className="job-meta">{job.location&&<span>
<MapPin size={14}/>{job.location}</span>}{job.salary_range&&<span>
<IndianRupee size={14}/>{job.salary_range}</span>}{job.deadline&&<span>
<Clock3 size={14}/>Apply by {new Date(job.deadline).toLocaleDateString()}</span>}</div>
</div>
<Link className="icon-link" to={`/openings/${job.id}`} aria-label="View opening">
<ArrowRight/>
</Link>
</article>}

export function Home() {
const [jobs,setJobs]=useState([]),[signedIn,setSignedIn]=useState(false);
useEffect(()=>{getSession().then(s=>{setSignedIn(Boolean(s));
if(s)getPublishedJobs().then(x=>setJobs(x.slice(0,2))).catch(()=>{})})},[]);
return <>
<section className="hero">
<div className="hero-copy">
<span className="eyebrow light-eyebrow">DKTE · DEPARTMENT OF MANAGEMENT STUDIES</span>
<h1>Your next opportunity<br/>
<em>starts here.</em>
</h1>
<p>A single place to discover placement opportunities, check your eligibility and manage your applications.</p>
<div className="hero-actions">
<Link className="btn btn-white" to="/openings">Explore openings <ArrowRight size={17}/>
</Link>
<Link className="btn btn-outline" to="/about">How it works</Link>
</div>
<div className="hero-note">
<ShieldCheck size={16}/> Exclusive portal for registered students</div>
</div>
<div className="hero-visual">
<div className="orbit orbit-one"/>
<div className="orbit orbit-two"/>
<div className="hero-emblem">
<GraduationCap size={78}/>
<span>CAREER<br/>BEGINS HERE</span>
</div>
<div className="floating-card float-a">
<span className="float-dot"/> Verified student access</div>
<div className="floating-card float-b">
<BriefcaseBusiness size={17}/> Opportunities in one place</div>
</div>
</section>
<section className="section">
<div className="section-heading">
<div>
<span className="eyebrow">OPPORTUNITIES</span>
<h2>Latest openings</h2>
<p>Explore the latest opportunities shared by the Placement Cell.</p>
</div>
<Link className="text-link" to="/openings">View all openings <ArrowRight size={16}/>
</Link>
</div>{jobs.length?<div className="job-list">{jobs.map(j=>
<JobCard key={j.id} job={j}/>)}</div>:signedIn?<Empty/>:<div className="empty-state">
<LockKeyhole size={28}/>
<h3>Sign in to view current openings</h3>
<p>Placement opportunities are available to registered students only.</p>
<Link className="btn btn-primary" to="/login">Student sign in <ArrowRight size={16}/>
</Link>
</div>}</section>
<section className="feature-band">
<div>
<span className="eyebrow light-eyebrow">ONE PORTAL. EVERY STEP.</span>
<h2>From discovery<br/>to application.</h2>
</div>
<div className="feature-grid">
<div>
<Users/>
<h3>Your profile</h3>
<p>Keep your academic and contact details in one place.</p>
</div>
<div>
<CheckCircle2/>
<h3>Eligibility checks</h3>
<p>Know whether you meet an opening's criteria before applying.</p>
</div>
<div>
<FileText/>
<h3>Application tracking</h3>
<p>Follow the status of every application you submit.</p>
</div>
</div>
</section>
</>}

export function About() {
return <main className="content-page">
<PageHead eyebrow="ABOUT THE PORTAL" title="A simpler placement journey." desc="The DKTE Placement Portal brings student registration, job opportunities and application tracking into one organised platform."/>
<div className="about-grid">
<div className="about-panel">
<span className="eyebrow">THE PURPOSE</span>
<h2>One reliable place for placement activity.</h2>
<p>The portal is designed to support the Placement Cell's recruitment workflow. Students maintain their profile once, review opportunities and submit applications online. Placement administrators manage openings and share applicant details with recruiters.</p>
</div>
<div className="steps-card">
<h3>How it works</h3>{['Verify your approved PRN and create an account','Complete your student and academic profile','Explore openings and review eligibility criteria','Apply for suitable positions and track progress'].map((s,i)=>
<div className="step-row" key={s}>
<b>0{i+1}</b>
<span>{s}</span>
</div>)}</div>
</div>
</main>}

export function Help() {
const [contacts,setContacts]=useState({});
useEffect(()=>{if(supabase)supabase.from('portal_settings').select('key,value').then(({data})=>{const x={};
(data||[]).forEach(r=>x[r.key]=r.value);
setContacts(x)})},[]);
return <main className="content-page">
<PageHead eyebrow="HELP CENTRE" title="Need a hand?" desc="Follow these steps to get started with the placement portal."/>
<div className="help-grid">
<div className="help-card">
<LockKeyhole/>
<h3>Account creation</h3>
<p>Use the PRN assigned by the college. Complete identity verification and create your login credentials.</p>
</div>
<div className="help-card">
<Users/>
<h3>Complete your profile</h3>
<p>Enter accurate contact information, academic marks and graduation stream before applying.</p>
</div>
<div className="help-card">
<BriefcaseBusiness/>
<h3>Apply for openings</h3>
<p>Review the job description, eligibility requirements, positions and application deadline.</p>
</div>
</div>
<div className="notice">
<b>Placement Cell contacts</b>
<p>TPO MBA: {contacts.tpo_mba||'Contact details will be updated by the Placement Cell.'}</p>
<p>Student Placement Coordinator 1: {contacts.coordinator_one||'Contact details will be updated by the Placement Cell.'}</p>
<p>Student Placement Coordinator 2: {contacts.coordinator_two||'Contact details will be updated by the Placement Cell.'}</p>
</div>
</main>}

export function Openings() {
const [jobs,setJobs]=useState([]),[loading,setLoading]=useState(true),[err,setErr]=useState('');
useEffect(()=>{getPublishedJobs().then(setJobs).catch(e=>setErr(e.message)).finally(()=>setLoading(false))},[]);
return <main className="content-page">
<PageHead eyebrow="CAREER OPPORTUNITIES" title="Current openings" desc="Explore active opportunities published by the Placement Cell."/>
<div className="opening-toolbar">
<span>{jobs.length} published {jobs.length===1?'opening':'openings'}</span>
<span className="secure-label">
<ShieldCheck size={15}/> Student access</span>
</div>{loading?<div className="loading">Loading openings…</div>:err?<div className="notice">{err}</div>:jobs.length?<div className="job-list">{jobs.map(j=>
<JobCard key={j.id} job={j}/>)}</div>:<Empty/>}</main>}

export function JobDetails() {
const {id}=useParams(),[job,setJob]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
useEffect(()=>{Promise.all([getPublishedJobs(),getMyProfile()]).then(([jobs,p])=>{setJob(jobs.find(x=>x.id===id));
setProfile(p)}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[id]);
if(loading)return <div className="loading">Loading opening…</div>;
if(error)return <main className="content-page">
<div className="notice">{error}</div>
</main>;
if(!job)return <main className="content-page">
<Empty title="Opening not found"/>
</main>;
return <main className="content-page">
<Link className="back-link" to="/openings">← Back to openings</Link>
<div className="detail-layout">
<section className="detail-main">
<span className="eyebrow">{job.company_name}</span>
<h1>{job.opening_title}</h1>
<div className="job-meta">{job.location&&<span>
<MapPin size={15}/>{job.location}</span>}{job.salary_range&&<span>
<IndianRupee size={15}/>{job.salary_range}</span>}</div>
<div className="detail-section">
<h3>Job description</h3>
<p className="preserve-lines">{job.description||'Please contact the Placement Cell for further details.'}</p>
</div>
<div className="detail-section">
<h3>Available positions</h3>
<ul>{(job.job_positions||[]).map(p=>
<li key={p.id}>{p.position_name}</li>)}</ul>
</div>
<div className="detail-section">
<h3>Eligibility</h3>
<p>Eligible streams: {(job.job_streams||[]).map(s=>s.stream_name).join(', ')||'As specified by the Placement Cell'}.</p>{(job.eligibility_criteria||[]).map(c=>
<p key={c.id}>{c.qualification}: minimum {c.minimum_value}{c.marks_type==='cgpa'?' CGPA':'%'}</p>)}</div>
</section>
<aside className="apply-card">
<span className="eyebrow">APPLICATION</span>
<h3>Ready to apply?</h3>
<p>Your registered profile and academic details will be used to check eligibility.</p>
<p className="deadline-line">{job.deadline?`Deadline: ${new Date(job.deadline).toLocaleDateString()}`:'Check the deadline with the Placement Cell.'}</p>
<Link className="btn btn-primary full" to={`/openings/${id}/apply`}>Continue to application <ArrowRight size={16}/>
</Link>
<small>One application per position.</small>
</aside>
</div>
</main>}

export function Register() {
const nav=useNavigate(),[stage,setStage]=useState(1),[form,setForm]=useState({prn:'',dob:'',name:'',mobile:'',email:'',address:'',tenth:'',twelfth:'',graduation:'',graduation_type:'percentage',graduation_max_cgpa:'',mba_fy:'',stream:'',password:''}),[busy,setBusy]=useState(false),[error,setError]=useState('');
const change=e=>setForm({...form,[e.target.name]:e.target.value});
async function submit(e) {
e.preventDefault();
setBusy(true);
setError('');
try{const {data,error}=await supabase.functions.invoke('register-student',{body:form});
if(error)throw error;
if(data?.error)throw new Error(data.error);
await supabase.auth.signInWithPassword({email:form.email,password:form.password});
nav('/student')}catch(e) {
setError(e.message||'Registration could not be completed.')}finally{setBusy(false)}}
return <main className="auth-page">
<div className="auth-aside">
<span className="eyebrow light-eyebrow">STUDENT REGISTRATION</span>
<h1>Take the first step towards your next opportunity.</h1>
<p>Verify your approved PRN, create your account and keep your placement profile ready.</p>
<div className="auth-benefit">
<ShieldCheck/> Approved student access</div>
<div className="auth-benefit">
<BriefcaseBusiness/> One profile for every application</div>
</div>
<form className="auth-card" onSubmit={e=>{if(stage===1) {
e.preventDefault();
(async()=>{setBusy(true);
setError('');
try{const {data,error}=await supabase.functions.invoke('verify-prn',{body:{prn:form.prn}});
if(error)throw error;
if(!data?.verified)throw new Error('This PRN is invalid or has already been registered. Contact the Placement Cell if you need assistance.');
setStage(2)}catch(err) {
setError(err.message)}finally{setBusy(false)}})()}else submit(e)}}>
<div className="form-progress">
<span className={stage===1?'active':''}>01 · Verify PRN</span>
<span className={stage===2?'active':''}>02 · Create profile</span>
</div>
<h2>{stage===1?'Verify your student identity':'Create your account'}</h2>
<p className="muted">{stage===1?'Enter the PRN assigned to you and your date of birth.':'Complete your details carefully. They will be used for placement applications.'}</p>{error&&<div className="form-error">{error}</div>}{stage===1?<>
<label>College PRN<input name="prn" value={form.prn} onChange={change} placeholder="e.g. 25PMB001" required autoCapitalize="characters"/>
</label>
<label>Date of birth<input type="date" name="dob" value={form.dob} onChange={change} required/>
</label>
<button className="btn btn-primary full" type="submit">{busy?'Verifying…':'Verify and continue'} <ArrowRight size={16}/>
</button>
</>:<>
<div className="form-grid">
<label>Full name<input name="name" value={form.name} onChange={change} required/>
</label>
<label>Mobile number<input name="mobile" value={form.mobile} onChange={change} inputMode="tel" required/>
</label>
<label>Email address<input name="email" type="email" value={form.email} onChange={change} required/>
</label>
<label>Graduation stream<input name="stream" value={form.stream} onChange={change} placeholder="e.g. BCA, BBA, B.Com" required/>
</label>
</div>
<label>Address<textarea name="address" value={form.address} onChange={change} rows="2" required/>
</label>
<div className="form-grid">
<label>10th marks (%)<input type="number" min="0" max="100" step="0.01" name="tenth" value={form.tenth} onChange={change} required/>
</label>
<label>12th marks (%)<input type="number" min="0" max="100" step="0.01" name="twelfth" value={form.twelfth} onChange={change} required/>
</label>
<label>Graduation marks<input type="number" min="0" step="0.01" name="graduation" value={form.graduation} onChange={change} required/>
</label>
<label>Graduation result type<select name="graduation_type" value={form.graduation_type} onChange={change}>
<option value="percentage">Percentage</option>
<option value="cgpa">CGPA</option>
</select>
</label>{form.graduation_type==='cgpa'&&<label>Maximum graduation CGPA<input type="number" min="0.01" step="0.01" name="graduation_max_cgpa" value={form.graduation_max_cgpa} onChange={change} required/>
</label>}<label>MBA first-year CGPA<input type="number" min="0" max="10" step="0.01" name="mba_fy" value={form.mba_fy} onChange={change} required/>
</label>
<label>Create password<input type="password" name="password" minLength="8" value={form.password} onChange={change} required autoComplete="new-password"/>
</label>
</div>
<div className="form-actions">
<button type="button" className="btn btn-ghost" onClick={()=>setStage(1)}>Back</button>
<button className="btn btn-primary" disabled={busy}>{busy?'Creating account…':'Create account'} <ArrowRight size={16}/>
</button>
</div>
</>}<p className="auth-foot">Already registered? <Link to="/login">Sign in</Link>
</p>
</form>
</main>}

export function Login() {

 const [prn,setPrn]=useState('');

 const [dob,setDob]=useState('');

 const [error,setError]=useState('');

 const [busy,setBusy]=useState(false);

 const nav=useNavigate();

 async function submit(e) {

  e.preventDefault();

  setBusy(true);

  setError('');

  try{
   const {data,error:invokeError}=await supabase.functions.invoke('student-login',{
    body:{prn:prn.trim().toUpperCase(),dob}
   });

   if(invokeError) throw invokeError;

   if(data?.error) throw new Error(data.error);

   if(!data?.token_hash) throw new Error('Login could not be completed. Please try again.');

   const {error:sessionError}=await supabase.auth.verifyOtp({
    token_hash:data.token_hash,
    type:'magiclink'
   });

   if(sessionError) throw sessionError;

   nav('/student');

  }catch(err) {

   setError(err.message||'Invalid PRN or date of birth.');

  }finally{
   setBusy(false);

  }
 }

 return <main className="auth-single">
<form className="auth-card" onSubmit={submit}>
  <span className="eyebrow">STUDENT ACCESS</span>
  <h2>Welcome back.</h2>
  <p className="muted">Sign in using your college PRN and date of birth.</p>
  {error&&<div className="form-error">{error}</div>}
  <label>College PRN<input value={prn} onChange={e=>setPrn(e.target.value.toUpperCase())} placeholder="e.g. 25PMB001" required autoCapitalize="characters"/>
</label>
  <label>Date of birth<input type="date" value={dob} onChange={e=>setDob(e.target.value)} required/>
</label>
  <button className="btn btn-primary full" disabled={busy}>{busy?'Signing in…':'Sign in'} <ArrowRight size={16}/>
</button>
  <p className="auth-foot">New to the portal? <Link to="/register">Create an account</Link>
</p>
 </form>
</main>
}

export function StudentDashboard() {
const [profile,setProfile]=useState(null),[jobs,setJobs]=useState([]),[apps,setApps]=useState([]);
useEffect(()=>{getMyProfile().then(setProfile).catch(()=>{});
getPublishedJobs().then(setJobs).catch(()=>{});
getMyApplications().then(setApps).catch(()=>{})},[]);
return <main className="content-page">
<PageHead eyebrow="STUDENT DASHBOARD" title={`Welcome${profile?.full_name?`, ${profile.full_name.split(' ')[0]}`:''}.`} desc="Your placement activity at a glance."/>
<div className="stats-grid">
<div className="stat-card">
<span>Available openings</span>
<b>{jobs.length}</b>
</div>
<div className="stat-card">
<span>Applications submitted</span>
<b>{apps.length}</b>
</div>
<div className="stat-card">
<span>Degree stream</span>
<b className="stat-stream">{profile?.graduation_stream||'—'}</b>
</div>
</div>
<div className="section-heading compact">
<div>
<h2>Recommended next step</h2>
<p>Keep your profile up to date and explore current opportunities.</p>
</div>
<Link className="btn btn-primary" to="/openings">Browse openings <ArrowRight size={16}/>
</Link>
</div>
<div className="dashboard-links">
<Link to="/applications">
<FileText/>
<span>
<b>My applications</b>
<small>Review your submitted applications and their status.</small>
</span>
<ArrowRight/>
</Link>
<Link to="/openings">
<BriefcaseBusiness/>
<span>
<b>Current openings</b>
<small>Explore opportunities published by the Placement Cell.</small>
</span>
<ArrowRight/>
</Link>
</div>
</main>}

export function MyApplications() {
const [apps,setApps]=useState([]);
useEffect(()=>{getMyApplications().then(setApps).catch(()=>{})},[]);
return <main className="content-page">
<PageHead eyebrow="STUDENT DASHBOARD" title="My applications" desc="Track the applications you have submitted."/>{apps.length?<div className="table-wrap">
<table>
<thead>
<tr>
<th>Company</th>
<th>Opening</th>
<th>Position</th>
<th>Applied on</th>
<th>Status</th>
</tr>
</thead>
<tbody>{apps.map(a=>
<tr key={a.id}>
<td>{a.job?.company_name}</td>
<td>{a.job?.opening_title}</td>
<td>{a.position?.position_name||'—'}</td>
<td>{new Date(a.created_at).toLocaleDateString()}</td>
<td>
<span className="status-pill">{a.status}</span>
</td>
</tr>)}</tbody>
</table>
</div>:<Empty title="No applications yet" desc="When you apply for an opening, it will appear here."/>}</main>}

export function ApplyForJob() {
const {id}=useParams(),nav=useNavigate(),[job,setJob]=useState(null),[profile,setProfile]=useState(null),[position,setPosition]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
useEffect(()=>{Promise.all([getPublishedJobs(),getMyProfile()]).then(([jobs,p])=>{setJob(jobs.find(x=>x.id===id));setProfile(p)}).catch(e=>setError(e.message))},[id]);

async function submit(e) {
  e.preventDefault();
  setBusy(true);
  setError('');

  try {
    const {data, error: invokeError} = await supabase.functions.invoke(
      'submit-application',
      {body: {job_id: id, position_id: position}}
    );

    if (invokeError) {
      let serverMessage = '';

      // Supabase may expose the Edge Function's JSON response on error.context.
      try {
        const response = invokeError.context;
        if (response && typeof response.json === 'function') {
          const errorBody = await response.json();
          serverMessage = errorBody?.error || errorBody?.message || '';
        }
      } catch {
        // Use a helpful fallback below if the response body is unavailable.
      }

      if (!serverMessage && invokeError.context?.status === 409) {
        serverMessage = 'You have already applied for this position.';
      }

      throw new Error(
        serverMessage || invokeError.message || 'Unable to submit application. Please try again.'
      );
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    if (!data?.success) {
      throw new Error('Unable to submit application. Please try again.');
    }

    setSuccess(`Application submitted successfully. Reference: ${data.application_id}`);
    setTimeout(() => nav('/applications'), 1800);
  } catch (submitError) {
    console.error('Application submission failed:', submitError);
    setError(submitError.message || 'Something went wrong. Please try again.');
  } finally {
    setBusy(false);
  }
}

if(!job)return <main className="content-page">
<div className="loading">Loading application…</div>
</main>;
return <main className="content-page">
<Link className="back-link" to={`/openings/${id}`}>← Back to opening</Link>
<div className="apply-form-layout">
<form className="auth-card" onSubmit={submit}>
<span className="eyebrow">APPLICATION FORM</span>
<h2>Apply to {job.company_name}</h2>
<p className="muted">Your verified profile details are shown below. Eligibility is checked securely when you submit.</p>
<div className="profile-summary">
<b>{profile?.full_name}</b>
<span>{profile?.prn} · {profile?.graduation_stream}</span>
<span>{profile?.email} · {profile?.mobile}</span>
</div>
<label>Select position<select value={position} onChange={e=>setPosition(e.target.value)} required>
<option value="">Choose a position</option>{(job.job_positions||[]).map(p=>
<option key={p.id} value={p.id}>{p.position_name}</option>)}</select>
</label>
<div className="notice">Your academic marks and graduation stream will be checked against this opening's eligibility criteria. You can apply once for each position.</div>
{error&&<div className="form-error">{error}</div>}
{success&&<div className="notice">{success}</div>}
<button className="btn btn-primary full" disabled={busy||!!success}>{busy?'Submitting…':'Confirm and submit application'} <ArrowRight size={16}/>
</button>
</form>
</div>
</main>}

export function NotFound() {
return <main className="content-page">
<PageHead eyebrow="404" title="Page not found" desc="The page you're looking for doesn't exist."/>
<Link className="btn btn-primary" to="/">Return home</Link>
</main>}
