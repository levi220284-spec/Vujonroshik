# Put Flat Meal Manager online (Supabase + Vercel)

Result: one link anyone can open to VIEW the meals and money. Only the manager, with a password, can change anything. Everyone sees the same data.

You need: a free Supabase account, a free Vercel account, a GitHub account.

## Part 1. Supabase (the shared database)

1. Go to supabase.com and sign up. Click **New project**.
2. Give it a name (for example `flat-meals`). It asks for a **database password**. Make one and save it somewhere. You will probably never need it, and it is NOT the manager password.
3. Pick the region closest to Bangladesh that the list offers. Click create and wait a minute or two.
4. In the left menu open **SQL Editor** and click **New query**.
5. Open the file `supabase/setup.sql` from this project, copy everything, paste it into the editor.
6. Near the bottom, find `CHANGE_THIS_PASSWORD` and replace it with your **manager password**. Keep the quote marks. Use something long (12+ characters) that you do not use anywhere else.
7. Click **Run**. You should see a success message. (It is safe to run again later.)
8. Get two values you need for Vercel:
   - **Project URL**, looks like `https://abcdxyz.supabase.co`
   - **Publishable key**, starts with `sb_publishable_`
   Find them with the **Connect** button at the top of the project, or in **Settings > API Keys**.
   Only ever use the publishable key. Never put a key starting with `sb_secret_` (or called `service_role`) anywhere in this app.

## Part 2. GitHub and Vercel (the website)

1. Put this project folder on GitHub as a new repository (do not upload `node_modules`).
2. Go to vercel.com, sign in with GitHub, click **Add New > Project**, choose the repository.
3. Vercel should detect Vite by itself. Before clicking Deploy, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your publishable key
4. Click **Deploy**. When it finishes you get a link.
   These two values are baked in when the site is built. If you ever change them, redeploy.

## Part 3. Check that it works

1. Open the link in a private/incognito window. You should see "View only" at the top. Click a meal cell: nothing changes and it says "View only".
2. Click **Unlock editing**, enter the manager password. Make a change. Wait for "All changes saved".
3. Open the link on another phone. It should show the same data.

## Moving your old data in
If you already typed data into the browser-only version: open it, Settings, **Export backup**. Then on the new site, unlock, Settings, **Import backup**. This replaces everything with the backup.

## Changing the manager password
In Supabase SQL Editor run (with your new password):

    insert into public.app_secret (id, password_hash)
    values (1, extensions.crypt('NEW_PASSWORD_HERE', extensions.gen_salt('bf')))
    on conflict (id) do update set password_hash = excluded.password_hash;

## Things to know
- Anyone with the link can READ everything (names, meals, money). Do not share it publicly.
- The password is the only protection for editing. There is no limit on wrong guesses, so a short or common password is a real weakness.
- There is one manager at a time. If two devices are unlocked and both edit, the later save wins.
- Still download a JSON backup (Settings) now and then.
- I believe free Supabase projects can be paused after a period of inactivity. Check their current rules. If it pauses, the site shows "Could not reach the database" until you resume it.
