create or replace function public.protect_founder_badge()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.badge is distinct from old.badge
     and new.badge ilike '%kurucu%'
     and not public.has_role(new.id, 'admin') then
    new.badge := old.badge;
  end if;
  return new;
end $$;
create trigger protect_founder_badge before update on public.profiles
for each row execute function public.protect_founder_badge();