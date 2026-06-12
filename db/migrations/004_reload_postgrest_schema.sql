-- Refresh Supabase/PostgREST schema cache after structural migrations.

NOTIFY pgrst, 'reload schema';
