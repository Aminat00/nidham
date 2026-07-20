-- Migration — Project Agent & Tasks backlog (2026-07-21)
-- Run this ONCE in the Supabase SQL editor if you already created the tables from
-- schema.sql before this date. It is idempotent (safe to re-run). New installs get all
-- of this from schema.sql directly and can skip this file.

-- 1) Allow the new 'milestone' category (project → milestone → step).
alter table public.items drop constraint if exists items_category_check;
alter table public.items add constraint items_category_check
  check (category in ('prayer','tesbihat','wird','task','project','milestone','step','errand'));

-- 2) Unscheduled (backlog) items have no day.
alter table public.items alter column day drop not null;

-- 3) Life-domain grouping + stable backlog ordering.
alter table public.items add column if not exists area text
  check (area in ('chore','admin','personal','self-dev','spiritual','errand','project'));
alter table public.items add column if not exists sort_order int;
