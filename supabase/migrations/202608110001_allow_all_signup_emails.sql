-- Temporary public signup: email verification remains required, but any valid
-- email provider can create and access an account.
drop trigger if exists require_auckland_email on auth.users;
