create table if not exists public.warehouse_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  warehouse text,
  location text,
  address text,
  company text,
  operator_id text unique,
  member_since text,
  updated_at timestamptz not null default now()
);

alter table public.warehouse_profiles enable row level security;

drop policy if exists "warehouse_profiles_select_own" on public.warehouse_profiles;
create policy "warehouse_profiles_select_own"
on public.warehouse_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "warehouse_profiles_insert_own" on public.warehouse_profiles;
create policy "warehouse_profiles_insert_own"
on public.warehouse_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "warehouse_profiles_update_own" on public.warehouse_profiles;
create policy "warehouse_profiles_update_own"
on public.warehouse_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.warehouse_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  climate_snapshot jsonb,
  batch_tracking jsonb,
  settings jsonb,
  updated_at timestamptz not null default now()
);

alter table public.warehouse_app_state enable row level security;

drop policy if exists "warehouse_app_state_select_own" on public.warehouse_app_state;
create policy "warehouse_app_state_select_own"
on public.warehouse_app_state
for select
using (auth.uid() = user_id);

drop policy if exists "warehouse_app_state_insert_own" on public.warehouse_app_state;
create policy "warehouse_app_state_insert_own"
on public.warehouse_app_state
for insert
with check (auth.uid() = user_id);

drop policy if exists "warehouse_app_state_update_own" on public.warehouse_app_state;
create policy "warehouse_app_state_update_own"
on public.warehouse_app_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.warehouses (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text not null,
  manager_name text,
  capacity_tons numeric not null default 0,
  current_stock_tons numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storage_zones (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  zone_code text not null,
  state text not null default 'safe',
  capacity_tons numeric not null default 0,
  occupied_tons numeric not null default 0,
  utilization_percent integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.batches (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  product_name text not null,
  farmer_name text not null,
  quantity_tons numeric not null,
  zone_code text not null,
  status text not null default 'active',
  entry_date timestamptz not null default now(),
  expiry_date timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  farmer_user_id uuid references auth.users(id) on delete set null
);

alter table public.warehouses add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;
alter table public.storage_zones add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;
alter table public.batches add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_warehouses_owner_user_id on public.warehouses(owner_user_id);
create index if not exists idx_storage_zones_warehouse_id on public.storage_zones(warehouse_id);
create index if not exists idx_storage_zones_state on public.storage_zones(state);
create index if not exists idx_storage_zones_owner_user_id on public.storage_zones(owner_user_id);
create index if not exists idx_batches_warehouse_id on public.batches(warehouse_id);
create index if not exists idx_batches_zone_code on public.batches(zone_code);
create index if not exists idx_batches_expiry_date on public.batches(expiry_date);
create index if not exists idx_batches_owner_user_id on public.batches(owner_user_id);

alter table public.warehouses enable row level security;
alter table public.storage_zones enable row level security;
alter table public.batches enable row level security;

drop policy if exists "warehouses_select_own" on public.warehouses;
create policy "warehouses_select_own"
on public.warehouses
for select
using (auth.uid() = owner_user_id);

drop policy if exists "warehouses_insert_own" on public.warehouses;
create policy "warehouses_insert_own"
on public.warehouses
for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "warehouses_update_own" on public.warehouses;
create policy "warehouses_update_own"
on public.warehouses
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "warehouses_delete_own" on public.warehouses;
create policy "warehouses_delete_own"
on public.warehouses
for delete
using (auth.uid() = owner_user_id);

drop policy if exists "storage_zones_select_own" on public.storage_zones;
create policy "storage_zones_select_own"
on public.storage_zones
for select
using (auth.uid() = owner_user_id);

drop policy if exists "storage_zones_insert_own" on public.storage_zones;
create policy "storage_zones_insert_own"
on public.storage_zones
for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "storage_zones_update_own" on public.storage_zones;
create policy "storage_zones_update_own"
on public.storage_zones
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "storage_zones_delete_own" on public.storage_zones;
create policy "storage_zones_delete_own"
on public.storage_zones
for delete
using (auth.uid() = owner_user_id);

drop policy if exists "batches_select_own" on public.batches;
create policy "batches_select_own"
on public.batches
for select
using (auth.uid() = owner_user_id);

drop policy if exists "batches_insert_own" on public.batches;
create policy "batches_insert_own"
on public.batches
for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "batches_update_own" on public.batches;
create policy "batches_update_own"
on public.batches
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "batches_delete_own" on public.batches;
create policy "batches_delete_own"
on public.batches
for delete
using (auth.uid() = owner_user_id);

create table if not exists public.region_storage_metrics (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  region_code text not null,
  total_capacity_tons numeric not null default 0,
  used_tons numeric not null default 0,
  free_tons numeric not null default 0,
  utilization_percent integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, region_code)
);

create index if not exists idx_region_storage_metrics_owner_user_id
  on public.region_storage_metrics(owner_user_id);

alter table public.region_storage_metrics enable row level security;

drop policy if exists "region_storage_metrics_select_own" on public.region_storage_metrics;
create policy "region_storage_metrics_select_own"
on public.region_storage_metrics
for select
using (auth.uid() = owner_user_id);

drop policy if exists "region_storage_metrics_insert_own" on public.region_storage_metrics;
create policy "region_storage_metrics_insert_own"
on public.region_storage_metrics
for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "region_storage_metrics_update_own" on public.region_storage_metrics;
create policy "region_storage_metrics_update_own"
on public.region_storage_metrics
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "region_storage_metrics_delete_own" on public.region_storage_metrics;
create policy "region_storage_metrics_delete_own"
on public.region_storage_metrics
for delete
using (auth.uid() = owner_user_id);

create table if not exists public.zone_climate_links (
  storage_zone_id uuid primary key references public.storage_zones(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  zone_code text not null,
  temperature_c numeric not null default 0,
  humidity_percent integer not null default 0,
  stock_tons numeric not null default 0,
  pressure_score numeric not null default 0,
  climate_state text not null default 'safe',
  updated_at timestamptz not null default now()
);

create index if not exists idx_zone_climate_links_owner_user_id
  on public.zone_climate_links(owner_user_id);

create index if not exists idx_zone_climate_links_zone_code
  on public.zone_climate_links(zone_code);

alter table public.zone_climate_links enable row level security;

drop policy if exists "zone_climate_links_select_own" on public.zone_climate_links;
create policy "zone_climate_links_select_own"
on public.zone_climate_links
for select
using (auth.uid() = owner_user_id);

drop policy if exists "zone_climate_links_insert_own" on public.zone_climate_links;
create policy "zone_climate_links_insert_own"
on public.zone_climate_links
for insert
with check (auth.uid() = owner_user_id);

drop policy if exists "zone_climate_links_update_own" on public.zone_climate_links;
create policy "zone_climate_links_update_own"
on public.zone_climate_links
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "zone_climate_links_delete_own" on public.zone_climate_links;
create policy "zone_climate_links_delete_own"
on public.zone_climate_links
for delete
using (auth.uid() = owner_user_id);
-- Farmer Profiles
create table if not exists public.farmer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text,
  farm_name text,
  location text,
  primary_crop text,
  farmer_id text unique,
  address text,
  company text,
  member_since text,
  updated_at timestamptz not null default now()
);

alter table public.farmer_profiles enable row level security;

drop policy if exists "farmer_profiles_select_own" on public.farmer_profiles;
create policy "farmer_profiles_select_own" on public.farmer_profiles for select using (auth.uid() = user_id);

drop policy if exists "farmer_profiles_insert_own" on public.farmer_profiles;
create policy "farmer_profiles_insert_own" on public.farmer_profiles for insert with check (auth.uid() = user_id);

drop policy if exists "farmer_profiles_update_own" on public.farmer_profiles;
create policy "farmer_profiles_update_own" on public.farmer_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Merchant Profiles
create table if not exists public.merchant_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text,
  business_name text,
  business_location text,
  address text,
  company text,
  merchant_id text unique,
  member_since text,
  updated_at timestamptz not null default now()
);

alter table public.merchant_profiles enable row level security;

drop policy if exists "merchant_profiles_select_own" on public.merchant_profiles;
create policy "merchant_profiles_select_own" on public.merchant_profiles for select using (auth.uid() = user_id);

drop policy if exists "merchant_profiles_insert_own" on public.merchant_profiles;
create policy "merchant_profiles_insert_own" on public.merchant_profiles for insert with check (auth.uid() = user_id);

drop policy if exists "merchant_profiles_update_own" on public.merchant_profiles;
create policy "merchant_profiles_update_own" on public.merchant_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Climate History for AI Trends
create table if not exists public.climate_history (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.storage_zones(id) on delete cascade,
  temperature_c numeric not null,
  humidity_percent numeric not null,
  recorded_at timestamptz not null default now()
);

alter table public.climate_history enable row level security;
create policy "climate_history_select_all" on public.climate_history for select using (true);
create policy "climate_history_insert_service" on public.climate_history for insert with check (true); -- Simplified for simulation

-- Merchant Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  merchant_user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  product_name text not null,
  quantity_tons numeric not null,
  total_price numeric not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
create policy "orders_select_own" on public.orders for select using (auth.uid() = merchant_user_id);
create policy "orders_insert_own" on public.orders for insert with check (auth.uid() = merchant_user_id);
create policy "orders_update_own" on public.orders for update using (auth.uid() = merchant_user_id);


-- Market Intelligence Tables

create table if not exists public.market_prices (
  id uuid primary key default gen_random_uuid(),
  crop text not null,
  unit_price numeric not null,
  percent_change numeric not null,
  region text not null,
  updated_at timestamptz not null default now()
);

alter table public.market_prices enable row level security;
create policy "market_prices_select_all" on public.market_prices for select using (true);

create table if not exists public.market_demands (
  id uuid primary key default gen_random_uuid(),
  crop text not null,
  trend text not null,
  region text not null,
  score integer not null,
  updated_at timestamptz not null default now()
);

alter table public.market_demands enable row level security;
create policy "market_demands_select_all" on public.market_demands for select using (true);

create table if not exists public.market_forecasts (
  id uuid primary key default gen_random_uuid(),
  crop text not null,
  status text not null,
  points jsonb not null, -- Array of price points
  region text not null,
  updated_at timestamptz not null default now()
);

alter table public.market_forecasts enable row level security;
create policy "market_forecasts_select_all" on public.market_forecasts for select using (true);

create table if not exists public.market_competitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  crop text not null,
  price numeric not null,
  region text not null,
  updated_at timestamptz not null default now()
);

alter table public.market_competitors enable row level security;
create policy "market_competitors_select_all" on public.market_competitors for select using (true);

create table if not exists public.market_supply_chain (
  id uuid primary key default gen_random_uuid(),
  inbound_stock_percent integer not null,
  arrival_volume_tons numeric not null,
  surplus_percent numeric not null,
  alerts jsonb not null, -- Array of alert objects {icon, text, posted}
  updated_at timestamptz not null default now()
);


-- Contact Messages
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  farmer_id text,
  warehouse_id text,
  subject text,
  message text,
  priority text,
  status text default 'Pending',
  also_email boolean default false,
  attachment_name text,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
create policy "contact_messages_select_own" on public.contact_messages for select using (auth.uid() = user_id);
create policy "contact_messages_insert_own" on public.contact_messages for insert with check (auth.uid() = user_id);
