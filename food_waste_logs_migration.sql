
-- Migration: Create food_waste_logs and insert mock data
create table if not exists public.food_waste_logs (
  id uuid default gen_random_uuid() primary key,
  outlet_id uuid not null references public.outlets(id),
  mass_kg numeric not null default 0,
  cost_per_kg numeric not null default 6.53,
  is_mock boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.food_waste_logs enable row level security;
drop policy if exists "Enable read for all" on public.food_waste_logs;
create policy "Enable read for all" on public.food_waste_logs for select using (true);
drop policy if exists "Enable all for all" on public.food_waste_logs;
create policy "Enable all for all" on public.food_waste_logs for all using (true) with check (true);

-- Permissions
grant all on public.food_waste_logs to authenticated, anon;

-- Clear previous mock-logs to prevent duplication
delete from public.food_waste_logs where is_mock = true;

-- Insert 7-day mock data (dated today)
insert into public.food_waste_logs (outlet_id, mass_kg, cost_per_kg, is_mock, created_at)
select id, 65.5, 6.53, true, now() from public.outlets where name = 'Royal';

insert into public.food_waste_logs (outlet_id, mass_kg, cost_per_kg, is_mock, created_at)
select id, 22.5, 6.53, true, now() from public.outlets where name = 'Fisher''s';

insert into public.food_waste_logs (outlet_id, mass_kg, cost_per_kg, is_mock, created_at)
select id, 8.2, 6.53, true, now() from public.outlets where name = 'Ralph''s';

insert into public.food_waste_logs (outlet_id, mass_kg, cost_per_kg, is_mock, created_at)
select id, 5.5, 6.53, true, now() from public.outlets where name = 'Gusto';
