-- Khata: Supabase schema (run in Supabase > SQL Editor)
-- Setup: Authentication > Providers > enable Google (add your Google OAuth client ID and secret).

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  is_admin boolean not null default false,
  is_active boolean not null default false,   -- you switch this on after offline payment
  active_until date,
  created_at timestamptz default now()
);

-- Auto-create a profile on first Google sign-in
create function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email) values (new.id, new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create function has_access() returns boolean language sql stable security definer as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.is_active
    and (p.active_until is null or p.active_until >= current_date));
$$;
create function is_admin() returns boolean language sql stable security definer as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create table books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users default auth.uid(),
  name text not null,
  created_at timestamptz default now()
);
create table entries (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books on delete cascade,
  user_id uuid not null references auth.users default auth.uid(),
  type text not null check (type in ('in','out')),
  amount numeric(14,2) not null check (amount > 0),
  category text not null,
  mode text not null default 'Cash',
  entry_date date not null default current_date,
  note text,
  created_at timestamptz default now()
);
create table parties (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books on delete cascade,
  user_id uuid not null references auth.users default auth.uid(),
  name text not null,
  kind text not null check (kind in ('customer','supplier'))
);
create table party_tx (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references parties on delete cascade,
  user_id uuid not null references auth.users default auth.uid(),
  kind text not null check (kind in ('due','pay')),
  amount numeric(14,2) not null check (amount > 0),
  tx_date date not null default current_date
);

-- Row level security: people see only their own data, and only while active
alter table profiles enable row level security;
create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "admin manages" on profiles for update using (is_admin());

do $$ declare t text; begin
  foreach t in array array['books','entries','parties','party_tx'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows" on %I for all using (user_id = auth.uid() and has_access()) with check (user_id = auth.uid() and has_access())', t);
  end loop;
end $$;

-- Make yourself admin after your first Google sign-in:
-- update profiles set is_admin = true, is_active = true where email = 'you@gmail.com';

-- ===== v2 (invoices, items, business) =====
-- Khata v2 migration (run once in Supabase SQL Editor if you already ran schema.sql)
alter table parties add column if not exists phone text;

create table if not exists business (
  user_id uuid primary key references auth.users default auth.uid(),
  name text, gstin text, address text, phone text
);
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books on delete cascade,
  user_id uuid not null references auth.users default auth.uid(),
  name text not null, hsn text, unit text default 'pcs',
  price numeric(14,2) default 0, gst numeric(5,2) default 0,
  stock numeric(14,3) default 0, min_stock numeric(14,3) default 0,
  created_at timestamptz default now()
);
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books on delete cascade,
  user_id uuid not null references auth.users default auth.uid(),
  number text not null, inv_date date not null default current_date,
  party_id uuid references parties on delete set null,
  customer_name text, customer_gstin text, same_state boolean default true,
  items jsonb not null, subtotal numeric(14,2), tax numeric(14,2), total numeric(14,2),
  paid numeric(14,2) default 0, created_at timestamptz default now()
);
do $$ declare t text; begin
  foreach t in array array['business','items','invoices'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "own rows" on %I', t);
    execute format('create policy "own rows" on %I for all using (user_id = auth.uid() and has_access()) with check (user_id = auth.uid() and has_access())', t);
  end loop;
end $$;
