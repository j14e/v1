# v1

An intentionally simple University of Auckland contact directory.

## What it does

- Public directory of verified University of Auckland members
- Signup restricted to `@aucklanduni.ac.nz`
- Email confirmation, sign in, and profile management through Supabase
- Search and filter by year, programme, major, and department
- Friend requests between verified members
- Private text, image, and voice-note messaging without requiring friendship
- Password-protected owner administration at `/admin`
- Optional profile photos and course listings

## Local setup

1. Link the project to Vercel and pull its environment variables.
2. Run `npm install`.
3. Run `npm run db:migrate`.
4. Run `npm run dev`.

The production deployment is managed by Vercel.
