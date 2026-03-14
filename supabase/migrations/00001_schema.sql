create extension if not exists "pgcrypto";

------------------------------------------------------------
-- QUESTIONS (seed data)
------------------------------------------------------------
create table questions (
    id              uuid primary key default gen_random_uuid(),
    lang            text not null default 'he',
    question_text   text not null,
    real_answer     text not null,
    fake_answers    text[] not null default '{}',
    citation        text,
    created_at      timestamptz not null default now()
);

create index idx_questions_lang on questions(lang);

------------------------------------------------------------
-- GAMES
------------------------------------------------------------
create table games (
    pin             text primary key,
    locale          text not null default 'he',
    state           smallint not null default 0,
    state_ts        bigint not null default (extract(epoch from now()) * 1000)::bigint,
    round_index     smallint not null default 0,
    question_index  smallint not null default 0,
    total_q         smallint not null default 7,
    current_q       text,
    has_presenter   boolean not null default false,
    fork_pin        text,
    created_at      timestamptz not null default now()
);

create index idx_games_created_at on games(created_at);

------------------------------------------------------------
-- GAME_QUESTIONS
------------------------------------------------------------
create table game_questions (
    game_pin        text not null references games(pin) on delete cascade,
    q_index         smallint not null,
    question_id     uuid not null references questions(id),
    primary key (game_pin, q_index)
);

------------------------------------------------------------
-- PLAYERS
------------------------------------------------------------
create table players (
    id              uuid primary key default gen_random_uuid(),
    game_pin        text not null references games(pin) on delete cascade,
    nickname        text not null,
    score           integer not null default 0,
    join_order      smallint not null,
    created_at      timestamptz not null default now()
);

create index idx_players_game_pin on players(game_pin);

------------------------------------------------------------
-- ANSWERS
------------------------------------------------------------
create table answers (
    id              uuid primary key default gen_random_uuid(),
    game_pin        text not null,
    question_index  smallint not null,
    player_id       uuid references players(id),
    answer_text     text not null,
    is_house_lie    boolean not null default false,
    is_real_answer  boolean not null default false,
    score           integer not null default 0
);

create index idx_answers_game_q on answers(game_pin, question_index);

------------------------------------------------------------
-- ANSWER_SELECTIONS
------------------------------------------------------------
create table answer_selections (
    id              uuid primary key default gen_random_uuid(),
    game_pin        text not null,
    question_index  smallint not null,
    player_id       uuid not null references players(id),
    selected_answer_id uuid not null references answers(id),
    score           integer not null default 0,
    unique (game_pin, question_index, player_id)
);

create index idx_selections_game_q on answer_selections(game_pin, question_index);

------------------------------------------------------------
-- REVEAL_ANSWERS
------------------------------------------------------------
create table reveal_answers (
    id              uuid primary key default gen_random_uuid(),
    game_pin        text not null,
    question_index  smallint not null,
    answer_text     text not null,
    is_real_answer  boolean not null default false,
    is_house_lie    boolean not null default false,
    creator_ids     uuid[] not null default '{}',
    selector_ids    uuid[] not null default '{}',
    points          integer not null default 0,
    display_order   smallint not null default 0
);

create index idx_reveal_game_q on reveal_answers(game_pin, question_index);

------------------------------------------------------------
-- CLEANUP FUNCTION
------------------------------------------------------------
create or replace function cleanup_old_games()
returns void as $$
begin
    delete from games where created_at < now() - interval '24 hours';
end;
$$ language plpgsql security definer;
