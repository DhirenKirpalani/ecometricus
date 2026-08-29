-- Migration: Create resource_logs and setup resource_stacked_chart view

-- 1. Create resource_logs table
create table if not exists public.resource_logs (
  id uuid default gen_random_uuid() primary key,
  outlet_id uuid not null references public.outlets(id),
  resource_type text not null check (resource_type in ('water', 'energy')),
  amount numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.resource_logs enable row level security;
drop policy if exists "Enable read for all" on public.resource_logs;
create policy "Enable read for all" on public.resource_logs for select using (true);
drop policy if exists "Enable all for all" on public.resource_logs;
create policy "Enable all for all" on public.resource_logs for all using (true) with check (true);

grant all on public.resource_logs to authenticated, anon;

-- 2. Create resource_stacked_chart view
drop view if exists public.resource_stacked_chart;
create or replace view public.resource_stacked_chart as
select 
  to_char(rl.created_at, 'Dy') as day_label,
  extract(dow from rl.created_at) as day_index,
  o.name as outlet_name,
  rl.resource_type,
  sum(rl.amount) as total_amount
from public.resource_logs rl
join public.outlets o on rl.outlet_id = o.id
where rl.created_at >= (now() - interval '14 days')
group by 1, 2, 3, 4
order by day_index asc;

grant select on public.resource_stacked_chart to authenticated, anon;

-- 3. Insert Royal Live Mock Data (Last 7 days)
-- We use a series of inserts to ensure 'Live' Royal data exists for the dashboard
insert into public.resource_logs (outlet_id, resource_type, amount, created_at)
select id, 'water', 1250, current_date - interval '0 days' from public.outlets where name = 'Royal'
union all
select id, 'water', 1420, current_date - interval '1 days' from public.outlets where name = 'Royal'
union all
select id, 'water', 1100, current_date - interval '2 days' from public.outlets where name = 'Royal'
union all
select id, 'water', 1350, current_date - interval '3 days' from public.outlets where name = 'Royal'
union all
select id, 'water', 1580, current_date - interval '4 days' from public.outlets where name = 'Royal'
union all
select id, 'water', 1210, current_date - interval '5 days' from public.outlets where name = 'Royal'
union all
select id, 'water', 4200, current_date - interval '6 days' from public.outlets where name = 'Royal'; -- Violation!

insert into public.resource_logs (outlet_id, resource_type, amount, created_at)
select id, 'energy', 55, current_date - interval '0 days' from public.outlets where name = 'Royal'
union all
select id, 'energy', 48, current_date - interval '1 days' from public.outlets where name = 'Royal'
union all
select id, 'energy', 62, current_date - interval '2 days' from public.outlets where name = 'Royal'
union all
select id, 'energy', 51, current_date - interval '3 days' from public.outlets where name = 'Royal'
union all
select id, 'energy', 185, current_date - interval '4 days' from public.outlets where name = 'Royal' -- Violation!
union all
select id, 'energy', 42, current_date - interval '5 days' from public.outlets where name = 'Royal'
union all
select id, 'energy', 58, current_date - interval '6 days' from public.outlets where name = 'Royal';
