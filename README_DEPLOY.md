# Deployment Guide (Vercel + Supabase)

This project has been optimized for **Vercel** deployment with **Supabase** for permanent persistence and real-time synchronization.

## 1. Supabase Setup (Free)

1.  Create a free project at [supabase.com](https://supabase.com/).
2.  Go to **SQL Editor** and run the following script to create the rooms table:

    ```sql
    create table rooms (
      id text primary key,
      is_revealed boolean default false,
      created_at timestamptz default now()
    );

    -- Enable Realtime for this table
    alter publication supabase_realtime add table rooms;
    ```

3.  Go to **Project Settings > API** and copy your `Project URL` and `anon public` key.

## 2. Local Setup

1.  Create a `.env` file in the root directory.
2.  Paste your credentials:
    ```env
    VITE_SUPABASE_URL=your_url_here
    VITE_SUPABASE_ANON_KEY=your_key_here
    ```
3.  Run `npm install` and `npm run dev`.

## 3. Vercel Deployment (Free)

1.  Push your code to GitHub.
2.  Connect your repository to [Vercel](https://vercel.com/).
3.  In the **Environment Variables** section of the Vercel project settings, add:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
4.  Deploy! Vercel will automatically build and host your app as a static site.

## Why this is better?

- **Forever Free**: Both Vercel and Supabase have generous free tiers.
- **Permanent Rooms**: Room IDs are stored in the database, so they don't disappear when the server restarts.
- **Blazingly Fast**: Uses Supabase Realtime (Presence) for sub-100ms synchronization.
- **No Server Management**: You don't have to worry about Node.js processes or port conflicts.
