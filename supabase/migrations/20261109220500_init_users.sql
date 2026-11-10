-- Create a table for public profiles
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  role text default 'student'::text check (role in ('student', 'faculty', 'admin')),
  display_name text,
  university_id text,
  avatar_url text,
  is_verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.users enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on public.users
  for select using (true);

create policy "Users can insert their own profile." on public.users
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.users
  for update using (auth.uid() = id);
