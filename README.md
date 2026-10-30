# DKTE College Placement Portal (v2)

React + Vite + Supabase portal for student self-registration, placement openings, applications and admin exports.

## Included
- PRN allow-list generated in SQL: `25PMB001` through `25PMB140`.
- Student self-registration: PRN + DOB verification, then profile and Supabase Auth account creation.
- Student profile: name, mobile, email, address, 10th/12th percentage, graduation marks + type, MBA FY CGPA and graduation stream.
- Authenticated student access to published openings, eligibility details, applications and application tracking.
- Admin dashboard, job creation, eligibility configuration, applicant filtering and `.xlsx` export.
- Supabase RLS and Edge Functions for registration and application submission.

## 1. Create Supabase project
Create a Supabase project. Copy its Project URL and anon key into a new `.env.local` file:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Never put the service-role key in a `VITE_` variable or frontend code.

## 2. Run database migration
Open Supabase → SQL Editor and run `supabase/migrations/001_initial_schema.sql`.
This creates the tables and generates the approved PRN master list from `25PMB001` to `25PMB140` (safe to rerun).

## 3. Add trusted DOB verification hashes
The migration deliberately does not store DOB in plaintext. Before student registration can work, the Placement Cell must populate `approved_prns.dob_hash` from a trusted official source using bcrypt-compatible `crypt(..., gen_salt('bf'))` hashes. Do not ask students to set their own reference DOB. Restrict this operation to a trusted administrator/server-side import. Example for a single approved record, executed only in a secure admin session:

```sql
UPDATE public.approved_prns
SET dob_hash = crypt('2003-08-05', gen_salt('bf'))
WHERE prn = '25PMB001';
```
Do not put actual DOBs in shared scripts, frontend code, logs, or screenshots. If the college can verify PRN + DOB through an official API/SSO, use that instead of importing hashes.

## 4. Deploy Edge Functions
Install and authenticate Supabase CLI, link the project, then deploy:

```bash
supabase functions deploy verify-prn
supabase functions deploy register-student
supabase functions deploy submit-application
```
The Supabase platform provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions. Never expose the service role key to the browser.

## 5. Create the first admin
1. Create an account for the authorized placement administrator in Supabase Authentication → Users (or use the student login only after provisioning separately).
2. Copy that user's UUID.
3. Run this SQL as the project owner:

```sql
INSERT INTO public.admin_users(auth_user_id)
VALUES ('PASTE-AUTH-USER-UUID-HERE')
ON CONFLICT DO NOTHING;
```

Admin access is based on membership in `admin_users`; never allow public signup to assign admin roles.

## 6. Run locally

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## 7. Deploy frontend
Deploy the Vite project to Vercel. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Project Settings → Environment Variables, then redeploy.

## Important implementation notes
- The public Home/About/Help pages are public. Current openings, job details, application forms and student dashboard require login.
- Students can only read their own profile and applications. The approved PRN table has no client read policy.
- PRN + DOB pre-check is handled by `verify-prn`. Registration is handled by `register-student`: it checks the trusted DOB hash, creates an Auth user, claims the PRN and creates the profile.
- Application submission is handled by `submit-application`: it derives the student from the authenticated session, validates stream/marks/deadline/position and relies on `UNIQUE(job_id, student_id)` to block duplicates.
- Applicant Excel export includes personal and academic data. Share exports only with the relevant recruiter and through an approved secure channel.
- No fake/demo openings or student records are included.

## Before production
Test with a small set of approved test PRNs and test DOB hashes; test duplicate registration, wrong DOB, duplicate application, expired deadline, stream/marks ineligibility and admin/student RLS separation. Confirm the college's privacy and consent requirements before collecting or sharing personal data.
