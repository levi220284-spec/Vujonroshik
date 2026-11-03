# Flat Meal Manager

Meal tracking and expense splitting for a shared flat. React + TypeScript + Tailwind v4 + Recharts. No login, no backend. Data is saved in the browser (localStorage).

## Run it
    npm install
    npm run dev        # development server
    npm test           # unit tests for all calculations
    npm run build      # normal build into dist/
    SINGLE=1 npx vite build --outDir dist-single   # one self-contained index.html

## Where things live
- src/lib/calc.ts       the ONLY place meals and money are added up. Every page reads computeMonth().
- src/lib/storage.ts    Repository interface + localStorage version + backup validation.
                        For Supabase later, write another Repository and pass it to <StoreProvider repository={...}>.
- src/lib/store.tsx     app state and all actions (add meal, expense, deposit, member...).
- src/lib/dates.ts      month and leap-year handling.
- src/lib/csv.ts        CSV report builder.
- src/pages/*           one file per sidebar section.

## Rules the code follows
- Meal rate = total expenses / total meals. No meals means "Not calculated", never a divide by zero.
- Member cost = member meals x rate. Balance = deposits - cost (negative = due).
- Nothing is rounded until it is displayed.
- Months are not stored separately. Every record has a date, and a month is a filter, so editing March never touches April.

## Shared online version
See SETUP.md. With VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY set at build time the app reads from Supabase,
is view-only for everyone, and the manager unlocks editing with a password checked inside the database (supabase/setup.sql).
Without those variables it runs in browser-only mode.
