-- Dani marks a project "sent" when he delivers it. Until then the console fingerprints every play
-- per pana, shows the pana's email across the screen and pauses when the page is hidden.
alter table public.projects add column if not exists sent boolean not null default false;
