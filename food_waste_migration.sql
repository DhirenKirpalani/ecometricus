
-- Migration: Create food_waste_summary table
create table if not exists public.food_waste_summary (
  id uuid default gen_random_uuid() primary key,
  outlet_id uuid not null references public.outlets(id),
  mass_kg numeric not null default 0,
  carbon_co2e numeric not null default 0,
  cost_usd numeric not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.food_waste_summary enable row level security;
drop policy if exists "Enable read for all" on public.food_waste_summary;
create policy "Enable read for all" on public.food_waste_summary for select using (true);
drop policy if exists "Enable all for all" on public.food_waste_summary;
create policy "Enable all for all" on public.food_waste_summary for all using (true) with check (true);

-- Permissions
grant all on public.food_waste_summary to authenticated, anon;
