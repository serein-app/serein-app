-- À coller et exécuter dans Supabase > SQL Editor

create table if not exists app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

-- Chaque utilisateur ne peut lire/écrire QUE sa propre ligne
create policy "Users can view their own state"
  on app_state for select
  using (auth.uid() = user_id);

create policy "Users can insert their own state"
  on app_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own state"
  on app_state for update
  using (auth.uid() = user_id);
