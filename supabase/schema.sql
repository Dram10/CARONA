-- =====================================================================
-- Caronas Sonhar Acordado: banco de dados
-- Cole este arquivo inteiro no Supabase > SQL Editor e clique em "Run".
-- Pode rodar de novo sem problema: ele não apaga dados.
-- =====================================================================

-- ---------- Tabelas ----------

-- Perfil de cada pessoa (ligado ao login do Supabase)
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null check (char_length(name) between 2 and 80),
  phone       text not null check (phone ~ '^[0-9]{10,13}$'),  -- só números, com DDD
  bairro      text check (char_length(bairro) <= 80),
  is_coord    boolean not null default false,                -- faz parte da coordenação?
  consent_at  timestamptz not null default now(),            -- aceite do uso dos dados (LGPD)
  created_at  timestamptz not null default now()
);

-- Caronas oferecidas pelos motoristas
create table if not exists public.rides (
  id           uuid primary key default gen_random_uuid(),
  driver_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  ride_date    date not null,
  ride_time    time not null,
  origin       text not null check (char_length(origin) between 2 and 120),
  destination  text not null check (char_length(destination) between 2 and 120),
  seats        int  not null check (seats between 1 and 8),
  note         text check (char_length(note) <= 300),
  delay_min    int  check (delay_min between 1 and 120),       -- atraso avisado pelo motorista
  canceled     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists rides_date_idx on public.rides (ride_date, ride_time);

-- Vagas reservadas (passageiro x carona)
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  ride_id       uuid not null references public.rides on delete cascade,
  passenger_id  uuid not null references public.profiles on delete cascade,
  confirmed_at  timestamptz,                                   -- confirmou que vai mesmo
  created_at    timestamptz not null default now(),
  unique (ride_id, passenger_id)
);

-- Pedidos de carona para a coordenação encaixar
create table if not exists public.requests (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  req_date     date not null,
  req_time     time not null,
  origin       text not null check (char_length(origin) between 2 and 120),
  destination  text not null check (char_length(destination) between 2 and 120),
  note         text check (char_length(note) <= 300),
  status       text not null default 'aberto' check (status in ('aberto', 'atendido', 'cancelado')),
  ride_id      uuid references public.rides on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists requests_date_idx on public.requests (req_date);

-- ---------- Funções auxiliares ----------

-- A pessoa logada é da coordenação?
create or replace function public.is_coord()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_coord from public.profiles where id = auth.uid()), false)
$$;

-- Só a coordenação pode dar ou tirar o papel de coordenação
-- (pelo SQL Editor do Supabase também pode, porque lá você é o administrador)
create or replace function public.guard_profile()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and new.is_coord is distinct from old.is_coord and not public.is_coord() then
    raise exception 'Só a coordenação pode mudar quem é da coordenação';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before update on public.profiles
  for each row execute function public.guard_profile();

-- Não deixa reservar carona lotada, cancelada ou a própria
create or replace function public.check_seat()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r public.rides;
  taken int;
begin
  select * into r from public.rides where id = new.ride_id for update;
  if r.id is null or r.canceled then
    raise exception 'Esta carona foi cancelada';
  end if;
  if r.driver_id = new.passenger_id then
    raise exception 'O motorista não pode reservar vaga na própria carona';
  end if;
  select count(*) into taken from public.bookings where ride_id = new.ride_id;
  if taken >= r.seats then
    raise exception 'Esta carona já está lotada';
  end if;
  return new;
end $$;
drop trigger if exists check_seat on public.bookings;
create trigger check_seat before insert on public.bookings
  for each row execute function public.check_seat();

-- ---------- Regras de acesso (Row Level Security) ----------

alter table public.profiles enable row level security;
alter table public.rides    enable row level security;
alter table public.bookings enable row level security;
alter table public.requests enable row level security;

-- Perfis: quem está logado vê nome e telefone dos outros membros (para o WhatsApp)
drop policy if exists "perfis: ver"      on public.profiles;
drop policy if exists "perfis: criar"    on public.profiles;
drop policy if exists "perfis: editar"   on public.profiles;
create policy "perfis: ver"    on public.profiles for select to authenticated using (true);
create policy "perfis: criar"  on public.profiles for insert to authenticated
  with check (id = auth.uid() and is_coord = false);
create policy "perfis: editar" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_coord());

-- Caronas: todos veem; o motorista (ou a coordenação) edita
drop policy if exists "caronas: ver"     on public.rides;
drop policy if exists "caronas: criar"   on public.rides;
drop policy if exists "caronas: editar"  on public.rides;
drop policy if exists "caronas: apagar"  on public.rides;
create policy "caronas: ver"    on public.rides for select to authenticated using (true);
create policy "caronas: criar"  on public.rides for insert to authenticated with check (driver_id = auth.uid());
create policy "caronas: editar" on public.rides for update to authenticated
  using (driver_id = auth.uid() or public.is_coord());
create policy "caronas: apagar" on public.rides for delete to authenticated
  using (driver_id = auth.uid() or public.is_coord());

-- Reservas: todos veem; o passageiro reserva/confirma/cancela a sua;
-- a coordenação pode encaixar alguém; o motorista pode tirar alguém da carona dele
drop policy if exists "reservas: ver"      on public.bookings;
drop policy if exists "reservas: criar"    on public.bookings;
drop policy if exists "reservas: editar"   on public.bookings;
drop policy if exists "reservas: apagar"   on public.bookings;
create policy "reservas: ver"    on public.bookings for select to authenticated using (true);
create policy "reservas: criar"  on public.bookings for insert to authenticated
  with check (passenger_id = auth.uid() or public.is_coord());
create policy "reservas: editar" on public.bookings for update to authenticated
  using (passenger_id = auth.uid() or public.is_coord());
create policy "reservas: apagar" on public.bookings for delete to authenticated
  using (
    passenger_id = auth.uid() or public.is_coord()
    or exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = auth.uid())
  );

-- Pedidos: cada pessoa vê os seus; a coordenação vê e atende todos
drop policy if exists "pedidos: ver"     on public.requests;
drop policy if exists "pedidos: criar"   on public.requests;
drop policy if exists "pedidos: editar"  on public.requests;
create policy "pedidos: ver"    on public.requests for select to authenticated
  using (person_id = auth.uid() or public.is_coord());
create policy "pedidos: criar"  on public.requests for insert to authenticated with check (person_id = auth.uid());
create policy "pedidos: editar" on public.requests for update to authenticated
  using (person_id = auth.uid() or public.is_coord());

-- ---------- Atualização ao vivo ----------
-- Faz o app atualizar sozinho quando alguém reserva, confirma ou avisa atraso.
do $$
begin
  begin alter publication supabase_realtime add table public.rides;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.bookings; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.requests; exception when duplicate_object then null; end;
end $$;

-- ---------- Primeira pessoa da coordenação ----------
-- Depois de criar sua conta no app, rode a linha abaixo trocando o e-mail:
-- update public.profiles set is_coord = true
--   where id = (select id from auth.users where email = 'seu-email@exemplo.com');
