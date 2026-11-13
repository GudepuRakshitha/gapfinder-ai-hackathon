-- GapFinder AI — Supabase schema
-- ---------------------------------------------------------------------------
-- Run this file once in the Supabase SQL editor (or with `supabase db push`).
-- The app uses the service-role key on the server, while Row Level Security is
-- still enabled so browser clients can only read their own rows.
--
-- Design notes
--   * Topic ids are deterministic UUIDs derived from student + subject + topic.
--     Re-analysing materials therefore keeps quiz history and mastery attached.
--   * `student_answers.question_id` is unique so re-submission is idempotent.
--   * `topic_mastery` is unique per (student_id, topic_id) for upserts.
--   * History tables intentionally do not cascade when a topic is re-mapped.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- Keep updated_at fresh on the tables that expose it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null default '',
  is_demo boolean not null default false,
  demo_seeded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists students_email_unique
  on public.students (lower(email));

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- materials
-- ---------------------------------------------------------------------------
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  name text not null,
  file_type text not null check (file_type in ('pdf', 'docx', 'txt')),
  size_bytes bigint not null default 0,
  word_count integer not null default 0,
  char_count integer not null default 0,
  page_count integer not null default 0,
  source_type text not null default 'other'
    check (source_type in ('syllabus', 'textbook', 'notes', 'past_paper', 'other')),
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'failed')),
  is_demo boolean not null default false,
  extracted_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists materials_student_created_idx
  on public.materials (student_id, created_at desc);
create index if not exists materials_student_source_idx
  on public.materials (student_id, source_type);

drop trigger if exists materials_set_updated_at on public.materials;
create trigger materials_set_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- document_chunks
-- ---------------------------------------------------------------------------
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  page integer,
  section text,
  source_type text not null default 'other',
  material_name text not null,
  word_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists document_chunks_student_idx
  on public.document_chunks (student_id, material_id, chunk_index);

-- ---------------------------------------------------------------------------
-- subjects / topics
-- ---------------------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  unique (student_id, name)
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null,
  subject_name text not null,
  name text not null,
  description text not null default '',
  subtopics jsonb not null default '[]'::jsonb,
  importance integer not null default 3 check (importance between 1 and 5),
  exam_frequency integer not null default 0,
  past_paper_questions jsonb not null default '[]'::jsonb,
  material_ids jsonb not null default '[]'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  ai_enhanced boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists topics_student_idx
  on public.topics (student_id, subject_name, name);

drop trigger if exists topics_set_updated_at on public.topics;
create trigger topics_set_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- quizzes
-- ---------------------------------------------------------------------------
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  mode text not null default 'topic' check (mode in ('topic', 'mixed')),
  topic_ids jsonb not null default '[]'::jsonb,
  question_ids jsonb not null default '[]'::jsonb,
  status text not null default 'generated'
    check (status in ('generated', 'submitted')),
  engine text not null default 'extractive',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  duration_seconds integer not null default 0,
  correct_count integer not null default 0,
  total_questions integer not null default 0,
  score_percentage numeric(5, 2) not null default 0
);

create index if not exists quiz_attempts_student_started_idx
  on public.quiz_attempts (student_id, started_at desc);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  topic_id uuid not null,
  topic_name text not null,
  subject_name text not null,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  correct_option_index integer not null,
  explanation text not null default '',
  difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard')),
  citations jsonb not null default '[]'::jsonb,
  source_chunk_ids jsonb not null default '[]'::jsonb,
  engine text not null default 'extractive',
  created_at timestamptz not null default now()
);

create index if not exists questions_attempt_idx
  on public.questions (attempt_id, created_at);

create table if not exists public.student_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null unique,
  student_id uuid not null references public.students(id) on delete cascade,
  topic_id uuid not null,
  topic_name text not null,
  difficulty text not null default 'medium',
  selected_option_index integer,
  is_correct boolean not null default false,
  explanation text not null default '',
  feedback text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists student_answers_student_idx
  on public.student_answers (student_id, topic_id, created_at);

create table if not exists public.topic_mastery (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  topic_id uuid not null,
  topic_name text not null,
  attempted integer not null default 0,
  correct integer not null default 0,
  incorrect integer not null default 0,
  mastery numeric(5, 2) not null default 0,
  status text not null default 'not_assessed'
    check (status in ('weak', 'medium', 'strong', 'not_assessed')),
  weakness_reason text not null default '',
  recommended_action text not null default '',
  last_attempted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (student_id, topic_id)
);

create index if not exists topic_mastery_student_idx
  on public.topic_mastery (student_id, status, mastery);

-- ---------------------------------------------------------------------------
-- revision plans
-- ---------------------------------------------------------------------------
create table if not exists public.revision_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  exam_date date,
  days_available integer not null default 7,
  hours_per_day numeric(4, 1) not null default 2,
  summary text not null default '',
  total_tasks integer not null default 0,
  total_minutes integer not null default 0,
  ai_enhanced boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists revision_plans_student_updated_idx
  on public.revision_plans (student_id, updated_at desc);

drop trigger if exists revision_plans_set_updated_at on public.revision_plans;
create trigger revision_plans_set_updated_at
  before update on public.revision_plans
  for each row execute function public.set_updated_at();

create table if not exists public.revision_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.revision_plans(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  day_index integer not null default 0,
  scheduled_date date not null,
  topic_id uuid,
  topic_name text not null default '',
  subject_name text not null default '',
  title text not null,
  duration_minutes integer not null default 30,
  objectives jsonb not null default '[]'::jsonb,
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  task_type text not null default 'learn'
    check (task_type in ('learn', 'practice', 'review', 'test')),
  sort_order integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz
);

create index if not exists revision_tasks_plan_idx
  on public.revision_tasks (plan_id, sort_order);
create index if not exists revision_tasks_student_date_idx
  on public.revision_tasks (student_id, scheduled_date);

-- ---------------------------------------------------------------------------
-- tutor history
-- ---------------------------------------------------------------------------
create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  topic_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  engine text not null default 'rule_based',
  created_at timestamptz not null default now()
);

create index if not exists chat_history_student_topic_idx
  on public.chat_history (student_id, topic_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.students enable row level security;
alter table public.materials enable row level security;
alter table public.document_chunks enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.questions enable row level security;
alter table public.student_answers enable row level security;
alter table public.topic_mastery enable row level security;
alter table public.revision_plans enable row level security;
alter table public.revision_tasks enable row level security;
alter table public.chat_history enable row level security;

-- Each signed-in user can only see rows whose student_id is their auth uid.
-- The service role used by the Next.js server bypasses these policies.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'materials', 'document_chunks', 'subjects', 'topics',
    'quiz_attempts', 'questions', 'student_answers', 'topic_mastery',
    'revision_plans', 'revision_tasks', 'chat_history'
  ]
  loop
    execute format('drop policy if exists "own rows" on public.%I', table_name);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (student_id = auth.uid())
         with check (student_id = auth.uid())',
      table_name
    );
  end loop;
end;
$$;

-- students is keyed by id rather than student_id.
drop policy if exists "own rows" on public.students;
drop policy if exists "read own profile" on public.students;
drop policy if exists "update own profile" on public.students;
create policy "read own profile" on public.students
  for select to authenticated using (id = auth.uid());
create policy "update own profile" on public.students
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants (Supabase normally provides these by default)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Optional demo seed
-- ---------------------------------------------------------------------------
-- Do not insert fake quiz attempts or scores. The demo workspace is created by
-- the application through the real extraction → chunking → topic mapping
-- pipeline (see /api/demo-seed and backend/services/seedService.ts).
