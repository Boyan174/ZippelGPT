-- ZippelGPT Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  age integer check (age >= 13 and age <= 120),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Chat sessions
create table public.chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default 'Neue Unterhaltung',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Messages
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index idx_chat_sessions_user_id on public.chat_sessions(user_id);
create index idx_messages_session_id on public.messages(session_id);
create index idx_messages_created_at on public.messages(created_at);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.messages enable row level security;

-- Policies: Users can only access their own data
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = user_id);

create policy "Users can view own chat sessions"
  on public.chat_sessions for select using (auth.uid() = user_id);

create policy "Users can create chat sessions"
  on public.chat_sessions for insert with check (auth.uid() = user_id);

create policy "Users can delete own chat sessions"
  on public.chat_sessions for delete using (auth.uid() = user_id);

create policy "Users can update own chat sessions"
  on public.chat_sessions for update using (auth.uid() = user_id);

create policy "Users can view messages in own sessions"
  on public.messages for select using (
    session_id in (select id from public.chat_sessions where user_id = auth.uid())
  );

create policy "Users can insert messages in own sessions"
  on public.messages for insert with check (
    session_id in (select id from public.chat_sessions where user_id = auth.uid())
  );

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for auto-creating profile
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

create trigger update_chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute procedure public.update_updated_at_column();
