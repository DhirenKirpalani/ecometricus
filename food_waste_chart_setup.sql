-- Migration: Create benchmarks and setup food_waste_stacked_chart view

-- 1. Create benchmarks table
create table if not exists public.benchmarks (
  id uuid default gen_random_uuid() primary key,
  food_waste_target_kg numeric not null default 80,
  financial_cap numeric not null default 650,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.benchmarks enable row level security;
drop policy if exists "Enable read for all" on public.benchmarks;
create policy "Enable read for all" on public.benchmarks for select using (true);
grant select on public.benchmarks to authenticated, anon;

-- Insert initial benchmark if none exists
insert into public.benchmarks (food_waste_target_kg) 
select 80 where not exists (select 1 from public.benchmarks);

-- 2. Create aggregated view for the Cumulative Stacked Chart
-- This view aggregates mass by day of week and outlet
drop view if exists public.food_waste_stacked_chart;
create or replace view public.food_waste_stacked_chart as
select 
  to_char(fwl.created_at, 'Dy') as day_label,
  extract(dow from fwl.created_at) as day_index,
  o.name as outlet_name,
  sum(fwl.mass_kg) as total_mass_kg
from public.food_waste_logs fwl
join public.outlets o on fwl.outlet_id = o.id
where fwl.created_at >= (now() - interval '7 days')
group by 1, 2, 3
order by day_index asc;

grant select on public.food_waste_stacked_chart to authenticated, anon;
