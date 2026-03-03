# Feature Plan: Supabase Integration + New Features

**Date:** March 3, 2026
**Status:** Planning
**Branch:** `claude/audit-homepage-wFsk2`

---

## Overview

Three new features need a backend. The current site is 100% static — all data lives in TypeScript files, the join form saves to localStorage only, and there are no API routes. Supabase provides the missing backend: database, auth, file storage, and edge functions.

---

## 1. Supabase Integration Architecture

### What Changes

```
BEFORE (current):
  Browser → Next.js (static) → TypeScript data files
  Join form → localStorage (data goes nowhere)

AFTER (with Supabase):
  Browser → Next.js → Supabase (database + auth + storage)
  Forms → Next.js Server Actions → Supabase → admin dashboard
```

### Dependencies to Add

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Environment Variables

```env
# .env.local (never committed)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # server-side only
```

### New File Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser client (uses anon key)
│   │   ├── server.ts          # Server client (uses service role)
│   │   └── types.ts           # Generated database types
│   └── actions/
│       ├── speaker.ts         # Server Actions for speaker applications
│       ├── project.ts         # Server Actions for project submissions
│       └── join.ts            # Server Actions for community join form
├── app/
│   ├── speak/                 # NEW: Speaker application page
│   │   └── page.tsx
│   ├── submit-idea/           # NEW: Project/idea submission page
│   │   └── page.tsx
│   └── admin/                 # NEW: Admin dashboard (protected)
│       ├── layout.tsx
│       ├── page.tsx           # Dashboard overview
│       ├── speakers/page.tsx  # Review speaker applications
│       ├── ideas/page.tsx     # Review project submissions
│       └── members/page.tsx   # View community members
```

### Database Schema

```sql
-- ============================================
-- TABLE: community_members
-- Replaces localStorage join form
-- ============================================
CREATE TABLE community_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,              -- 'developer', 'student', 'designer', etc.
  experience TEXT,                 -- 'beginner', 'intermediate', 'advanced'
  interests TEXT[],               -- ['claude-code', 'api', 'workshops', etc.]
  city TEXT,                      -- 'Nairobi', 'Mombasa', etc.
  how_heard TEXT,                 -- 'twitter', 'friend', 'event', etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending'   -- 'pending', 'approved', 'rejected'
);

-- ============================================
-- TABLE: speaker_applications
-- People applying to speak at events
-- ============================================
CREATE TABLE speaker_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Applicant info
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL,              -- Where they're based
  company TEXT,                    -- Optional: company/org
  title TEXT,                      -- Optional: job title
  linkedin_url TEXT,
  twitter_url TEXT,

  -- Talk info
  talk_title TEXT NOT NULL,
  talk_description TEXT NOT NULL,  -- What the talk covers (500 chars min)
  talk_type TEXT NOT NULL,         -- 'lightning' (5-10min), 'standard' (20-30min), 'workshop' (60min+)
  talk_category TEXT NOT NULL,     -- 'technical', 'career', 'fintech', 'ai-general', 'demo', 'panel'
  target_audience TEXT NOT NULL,   -- 'beginners', 'intermediate', 'advanced', 'all'

  -- Logistics
  preferred_event TEXT,            -- Slug of specific event, or 'any'
  preferred_city TEXT NOT NULL,    -- 'Nairobi', 'Mombasa', 'either'
  has_spoken_before BOOLEAN DEFAULT false,
  previous_talks TEXT,             -- Links or descriptions of past talks
  special_requirements TEXT,       -- AV needs, accessibility, etc.

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending',   -- 'pending', 'reviewed', 'accepted', 'rejected', 'waitlisted'
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);

-- ============================================
-- TABLE: project_submissions
-- Ideas seeking collaborators or funding
-- ============================================
CREATE TABLE project_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Submitter info
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_city TEXT,

  -- Project info
  project_name TEXT NOT NULL,
  description TEXT NOT NULL,          -- What the project does (min 200 chars)
  problem_statement TEXT NOT NULL,    -- What problem it solves
  current_stage TEXT NOT NULL,        -- 'idea', 'prototype', 'mvp', 'launched'
  tech_stack TEXT[],                  -- Technologies used/planned
  uses_claude BOOLEAN DEFAULT false,  -- Does it use Claude/Anthropic APIs?
  claude_usage TEXT,                  -- How Claude is used (if applicable)

  -- What they need
  looking_for TEXT[] NOT NULL,        -- ['cofounders', 'developers', 'funding', 'mentorship', 'feedback']
  funding_needed BOOLEAN DEFAULT false,
  funding_amount TEXT,                -- Range: 'under-50k', '50k-200k', '200k-1m', '1m+'
  funding_currency TEXT DEFAULT 'KES',
  equity_offered TEXT,                -- If offering equity: '1-5%', '5-10%', '10-20%', '20%+'

  -- Links
  demo_url TEXT,
  repo_url TEXT,
  pitch_deck_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending',     -- 'pending', 'featured', 'connected', 'archived'
  admin_notes TEXT,
  is_public BOOLEAN DEFAULT false    -- Show on projects page?
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;

-- Public can insert (submit forms)
CREATE POLICY "Anyone can submit" ON community_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can apply to speak" ON speaker_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can submit projects" ON project_submissions FOR INSERT WITH CHECK (true);

-- Only admins can read/update (via service role key in server actions)
-- Public can read approved/featured entries
CREATE POLICY "Public can read featured projects" ON project_submissions
  FOR SELECT USING (is_public = true);
```

---

## 2. Speaker Application Feature (`/speak`)

### Why This Feature

The community hosts regular events in Nairobi and Mombasa. Currently there's no way for community members to propose talks. Speakers are selected by organizers only. This limits content diversity and misses people with valuable expertise — especially in fintech, which is huge in Kenya (M-Pesa, fintech startups, etc.).

### User Flow

```
1. User visits /speak
2. Sees info about what kind of talks CCK hosts
3. Fills out application form:
   - Personal info (name, email, city, optional LinkedIn/Twitter)
   - Talk details (title, description, type, category)
   - Logistics (preferred city, event, AV needs)
4. Submits → Server Action → Supabase
5. Sees confirmation with what to expect next
6. Admin reviews in /admin/speakers
7. Admin accepts/rejects → (optional) notification email via Supabase Edge Function
```

### Talk Categories (designed for your audience)

| Category | Description |
|----------|-------------|
| `technical` | Claude Code deep-dives, API patterns, agentic workflows |
| `career` | AI career paths, developer journeys, interview tips |
| `fintech` | M-Pesa integrations, fintech AI, payment automation, banking APIs |
| `ai-general` | LLM concepts, prompt engineering, responsible AI |
| `demo` | Live project demos, tool showcases |
| `panel` | Discussion panels, Q&A sessions |

### Talk Types

| Type | Duration | Description |
|------|----------|-------------|
| `lightning` | 5-10 min | Quick share, demo, or tip |
| `standard` | 20-30 min | Full talk with Q&A |
| `workshop` | 60+ min | Hands-on session with audience participation |

### Page Design (Terminal Noir aesthetic)

The `/speak` page follows the existing design system:
- Terminal-themed header with `CommandPrefix`
- Info section explaining what kind of talks CCK hosts
- Categories displayed as terminal window cards
- Form styled like the existing TerminalApplication (but simplified — NOT 1,218 lines)
- Form uses standard form fields, not the terminal typing interface (better UX for this use case)
- Confirmation screen with terminal output aesthetic

### Implementation Notes

- Form uses React Hook Form or native form with Server Actions
- Validation: Zod schema (shared between client and server)
- No auth required to submit (public form)
- Rate limiting via Supabase RLS + IP-based throttle in Server Action
- Spam prevention: honeypot field + submission cooldown

---

## 3. Project/Idea Submission Feature (`/submit-idea`)

### Why This Feature

The projects page currently has 2 real projects and a "Your Project Here" placeholder. The Discord link is the only submission path. A proper submission form:
- Lowers the barrier (not everyone is on Discord)
- Captures structured data (tech stack, stage, what they need)
- Enables matchmaking (connect founders with developers, mentors with builders)
- Feeds the projects page with real content

### User Flow

```
1. User visits /submit-idea
2. Chooses what they have: "idea" vs "prototype" vs "launched project"
3. Fills out form:
   - Project details (name, description, problem, stage)
   - Tech stack + Claude usage
   - What they're looking for (cofounders, devs, funding, mentorship, feedback)
   - If seeking funding: amount range, equity offered
   - Links (demo, repo, pitch deck)
4. Submits → Server Action → Supabase
5. Sees confirmation
6. Admin reviews in /admin/ideas
7. Admin can:
   - Feature on projects page (sets is_public = true)
   - Connect submitter with community members
   - Share in Discord/WhatsApp for visibility
```

### "Looking For" Options

| Option | Who it attracts |
|--------|----------------|
| `cofounders` | People looking for partners to build with |
| `developers` | Need technical help building |
| `funding` | Looking for investors, grants, or sponsors |
| `mentorship` | Want guidance from experienced builders |
| `feedback` | Early stage, want community input |

### Funding Section (conditional)

Only shows if `looking_for` includes `funding`:
- Amount range (KES or USD selector)
- Equity offered (optional)
- Pitch deck URL (optional)

### Integration with Existing Projects Page

When an admin sets `is_public = true` on a submission, it should appear on the `/projects` page alongside the existing static projects. This means the projects page needs to:
1. Keep showing static projects from `projects.ts`
2. Also fetch approved submissions from Supabase
3. Merge and render both

### Page Design

- Terminal-themed header
- Step indicator (not the full terminal typing experience — that's too complex for this form)
- Clean form sections with the card/terminal window aesthetic
- File upload for pitch decks via Supabase Storage (optional)

---

## 4. Connect Existing Join Form to Supabase

### Current Problem

The `TerminalApplication.tsx` (1,218 lines) collects: name, email, role, experience, interests, city, and how they heard about CCK. But it only saves to `localStorage`. The "APPLICATION SUBMITTED" message is misleading — the data goes nowhere.

### Fix

1. Add a Server Action in `src/lib/actions/join.ts`
2. After the form collects all fields, call the Server Action instead of (or in addition to) localStorage
3. The Server Action inserts into `community_members` table
4. Keep localStorage as a cache for the "returning user" flow

### No Auth Required

The join form is a public submission — no Supabase auth needed. The Server Action uses the service role key to insert.

---

## 5. Admin Dashboard (`/admin`)

### Purpose

A simple, password-protected dashboard for community organizers to review and manage submissions.

### Authentication

- Supabase Auth with email/password (no social login needed)
- Only pre-approved admin emails can access
- Middleware checks auth on all `/admin/*` routes

### Pages

| Route | Purpose |
|-------|---------|
| `/admin` | Overview: pending counts, recent submissions |
| `/admin/speakers` | Review speaker applications, accept/reject |
| `/admin/ideas` | Review project submissions, feature/archive |
| `/admin/members` | View community members, export data |

### Design

- Same Terminal Noir aesthetic
- Table views with status filters
- Quick actions: accept, reject, archive
- Admin notes field on each submission
- Simple — no complex CMS, just review and manage

---

## 6. Implementation Phases

### Phase A: Foundation (Supabase Setup)
1. Create Supabase project
2. Run database migrations (create tables)
3. Configure RLS policies
4. Add environment variables
5. Create `src/lib/supabase/client.ts` and `server.ts`
6. Generate TypeScript types from database schema

### Phase B: Connect Join Form
1. Create `src/lib/actions/join.ts` Server Action
2. Add Zod validation schema
3. Modify TerminalApplication to call Server Action on submit
4. Test end-to-end

### Phase C: Speaker Application
1. Create `/speak` page with form
2. Create `src/lib/actions/speaker.ts` Server Action
3. Add Zod validation
4. Build confirmation UI
5. Add to navigation
6. Update sitemap

### Phase D: Project Submission
1. Create `/submit-idea` page with form
2. Create `src/lib/actions/project.ts` Server Action
3. Modify `/projects` page to merge static + Supabase data
4. Add to navigation
5. Update sitemap

### Phase E: Admin Dashboard
1. Set up Supabase Auth
2. Create middleware for `/admin/*` routes
3. Build admin layout + pages
4. Add review/manage functionality

---

## 7. What This Looks Like Against Existing Code

### Files Modified
- `src/components/terminal/TerminalApplication.tsx` — add Server Action call
- `src/app/projects/page.tsx` — fetch from Supabase + merge with static data
- `src/data/projects.ts` — keep as fallback/static data
- `src/lib/constants.ts` — add nav links for `/speak` and `/submit-idea`
- `src/app/sitemap.ts` — add new routes
- `package.json` — add Supabase deps

### Files Created
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/types.ts`
- `src/lib/actions/join.ts`
- `src/lib/actions/speaker.ts`
- `src/lib/actions/project.ts`
- `src/app/speak/page.tsx`
- `src/app/submit-idea/page.tsx`
- `src/app/admin/layout.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/speakers/page.tsx`
- `src/app/admin/ideas/page.tsx`
- `src/app/admin/members/page.tsx`
- `src/middleware.ts` (for admin auth)
- `.env.local.example`
- `supabase/migrations/001_initial_schema.sql`

### Files NOT Modified
- Design system (globals.css) stays the same
- Existing components keep working
- Static data files remain as fallbacks
- No breaking changes to any existing page

---

## Decision Points (Need Your Input)

1. **Supabase project**: Do you already have a Supabase project, or should we set one up?
2. **Admin access**: Which email addresses should have admin access?
3. **Funding section**: Should the funding/equity fields be on day one, or add later?
4. **Email notifications**: Want Supabase Edge Functions to send emails when someone submits? Or is checking the dashboard enough?
5. **Project visibility**: Should approved project submissions auto-appear on the public projects page, or require manual featuring?
