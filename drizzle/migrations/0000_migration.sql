create type public.app_role as enum ('admin','user');
create type public.list_status as enum ('watching','completed','plan','dropped');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Anime Sever',
  avatar_url text,
  bio text,
  badge text default 'AnimeXir Üyesi',
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique(user_id, role)
);
create table public.animes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cover_url text,
  banner_url text,
  description text,
  studio text,
  status text default 'Devam Ediyor',
  score numeric(3,1) default 0,
  genres text[] not null default '{}',
  has_dub boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  anime_id uuid not null references public.animes(id) on delete cascade,
  number int not null,
  title text,
  video_url text,
  created_at timestamptz not null default now(),
  unique(anime_id, number)
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create table public.ratings (
  anime_id uuid not null references public.animes(id) on delete cascade,
  user_id uuid not null,
  score int not null check (score between 1 and 10),
  primary key (anime_id, user_id)
);
create table public.user_anime (
  anime_id uuid not null references public.animes(id) on delete cascade,
  user_id uuid not null,
  status public.list_status not null,
  updated_at timestamptz not null default now(),
  primary key (anime_id, user_id)
);
create table public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  watched_at timestamptz not null default now()
);
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  is_playing boolean not null default false,
  position numeric not null default 0,
  created_at timestamptz not null default now()
);
create table public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create table public.community_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

grant select on public.profiles, public.animes, public.episodes, public.comments, public.ratings, public.rooms, public.room_messages, public.community_messages to anon;
grant select, insert, update, delete on public.profiles, public.animes, public.episodes, public.comments, public.ratings, public.user_anime, public.watch_history, public.rooms, public.room_messages, public.community_messages to authenticated;
grant select on public.user_roles to authenticated;
grant all on all tables in schema public to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.animes enable row level security;
alter table public.episodes enable row level security;
alter table public.comments enable row level security;
alter table public.ratings enable row level security;
alter table public.user_anime enable row level security;
alter table public.watch_history enable row level security;
alter table public.rooms enable row level security;
alter table public.room_messages enable row level security;
alter table public.community_messages enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "profiles read" on public.profiles for select using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "roles read own" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create policy "animes read" on public.animes for select using (true);
create policy "animes admin write" on public.animes for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "episodes read" on public.episodes for select using (true);
create policy "episodes admin write" on public.episodes for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "comments read" on public.comments for select using (true);
create policy "comments insert own" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "comments delete own or admin" on public.comments for delete to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create policy "ratings read" on public.ratings for select using (true);
create policy "ratings own" on public.ratings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_anime own" on public.user_anime for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "history own" on public.watch_history for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rooms read" on public.rooms for select using (true);
create policy "rooms create" on public.rooms for insert to authenticated with check (auth.uid() = host_id);
create policy "rooms host update" on public.rooms for update to authenticated using (auth.uid() = host_id);
create policy "rooms host delete" on public.rooms for delete to authenticated using (auth.uid() = host_id);

create policy "room msgs read" on public.room_messages for select using (true);
create policy "room msgs insert" on public.room_messages for insert to authenticated with check (auth.uid() = user_id);
create policy "community read" on public.community_messages for select using (true);
create policy "community insert" on public.community_messages for insert to authenticated with check (auth.uid() = user_id);
create policy "community delete" on public.community_messages for delete to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar_url, badge)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    case when lower(new.email) = 'kagangirgin43@gmail.com' then '👑 Kurucu' else 'AnimeXir Üyesi' end);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if lower(new.email) = 'kagangirgin43@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter publication supabase_realtime add table public.room_messages;
alter publication supabase_realtime add table public.community_messages;
alter publication supabase_realtime add table public.rooms;

insert into public.animes (id, title, cover_url, banner_url, description, studio, status, score, genres, has_dub, featured) values
('11111111-1111-1111-1111-111111111111','Solo Leveling','https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-it355ZgzquUd.png','https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg','Dünyanın en zayıf avcısı olarak bilinen Sung Jinwoo, gizemli bir çifte zindanda ölüm kalım savaşı verdikten sonra sadece kendisinin görebildiği özel bir sistem sayesinde sınırsız güç kazanmaya başlar.','A-1 Pictures','Tamamlandı',9.6,'{Aksiyon,Macera,Fantezi}',true,true);
insert into public.episodes (anime_id, number, title, video_url)
select '11111111-1111-1111-1111-111111111111', n, n || '. Bölüm', case when n = 1 then 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' else null end
from generate_series(1,12) n;
update public.episodes set title = 'Buna Alıştım' where number = 1;