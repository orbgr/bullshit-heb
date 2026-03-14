-- Enable RLS on all tables
alter table games enable row level security;
alter table players enable row level security;
alter table answers enable row level security;
alter table answer_selections enable row level security;
alter table reveal_answers enable row level security;
alter table questions enable row level security;
alter table game_questions enable row level security;

-- Games: anyone can read, only service_role can write
create policy "games_select" on games for select using (true);
create policy "games_insert" on games for insert with check (current_setting('role') = 'service_role');
create policy "games_update" on games for update using (current_setting('role') = 'service_role');
create policy "games_delete" on games for delete using (current_setting('role') = 'service_role');

-- Players: anyone can read, only service_role can write
create policy "players_select" on players for select using (true);
create policy "players_insert" on players for insert with check (current_setting('role') = 'service_role');
create policy "players_update" on players for update using (current_setting('role') = 'service_role');

-- Answers: anyone can read, only service_role can write
create policy "answers_select" on answers for select using (true);
create policy "answers_insert" on answers for insert with check (current_setting('role') = 'service_role');
create policy "answers_update" on answers for update using (current_setting('role') = 'service_role');

-- Answer selections: anyone can read, only service_role can write
create policy "selections_select" on answer_selections for select using (true);
create policy "selections_insert" on answer_selections for insert with check (current_setting('role') = 'service_role');
create policy "selections_update" on answer_selections for update using (current_setting('role') = 'service_role');

-- Reveal answers: anyone can read, only service_role can write
create policy "reveal_select" on reveal_answers for select using (true);
create policy "reveal_insert" on reveal_answers for insert with check (current_setting('role') = 'service_role');

-- Questions: only service_role can read (prevents cheating)
create policy "questions_select" on questions for select using (current_setting('role') = 'service_role');

-- Game questions: only service_role can read/write
create policy "game_questions_select" on game_questions for select using (current_setting('role') = 'service_role');
create policy "game_questions_insert" on game_questions for insert with check (current_setting('role') = 'service_role');
