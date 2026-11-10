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
