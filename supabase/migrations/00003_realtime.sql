-- Enable Realtime for game-critical tables
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table answers;
alter publication supabase_realtime add table answer_selections;
alter publication supabase_realtime add table reveal_answers;
