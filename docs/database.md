# The database

## You are already done

The database exists, is connected, and is working. **There is nothing to
install and nothing to set up.**

- You do **not** need MySQL. If it is on your machine, ignore it — this
  project never touches it and it does not need to be running.
- You do **not** need Postgres.
- You do **not** need Supabase.
- You do **not** need a username, a password, or a connection string.

If you installed the VS Code **SQLite Viewer** extension and can see the
tables, you have finished. Stop here. The rest of this page is reference for
later.

---

## What it is

Most databases (MySQL, Postgres) are *programs*: you install them, start
them, and log in over a network.

**SQLite is not a program. It is one file.**

```
C:\Users\lisam\carbon-credit\backend\data\app.db
```

That file is the entire database. Copy it and you have copied everything.
Delete it and the app builds a fresh one on the next start. Send it to a
teammate and they have your exact data.

Python has SQLite built in, which is why nothing needed installing.

## What is inside

| Table | Holds |
|---|---|
| `users` | The profiles you log in as |
| `claims` | Every action logged, and its status |
| `verifications` | What the verification pipeline returned |
| `swaps` | Trade requests between users |

Credit balances are deliberately **not** stored here — they are read from the
ledger on every request, so the app and the ledger can never disagree.

A fresh database contains the four login profiles and **no claims**. The
profiles have to exist, or there is nobody to log in as.

## Looking inside it

**VS Code (what you already did):** install the **SQLite Viewer** extension,
then click `backend/data/app.db` in the file tree.

**To edit rows by hand:** install **DB Browser for SQLite**
(<https://sqlitebrowser.org>) → Open Database → `app.db` → **Browse Data** →
**New Record** → type the values → **Write Changes**.

**Without installing anything:**

```powershell
cd C:\Users\lisam\carbon-credit\backend
.venv\Scripts\Activate.ps1
python -c "import sqlite3;c=sqlite3.connect('data/app.db');print([r for r in c.execute('SELECT id,name FROM users')])"
```

## Putting real data in

Easiest is DB Browser above. For anything repeatable, write a script —
`backend/load_data.py`:

```python
"""Load real data. Run:  python load_data.py"""
from sqlmodel import Session
from app.db import engine, create_db_and_tables
from app.models import User

create_db_and_tables()

with Session(engine) as session:
    session.add(User(name="Ananya", wallet_address="0xabc123..."))
    session.commit()
    print("added")
```

```powershell
cd C:\Users\lisam\carbon-credit\backend
.venv\Scripts\Activate.ps1
python load_data.py
```

`id` and `created_at` fill themselves in.

**Starting over:** stop the backend, delete `backend\data\app.db`, restart.
You get the four profiles and nothing else.

**Sample data for a rehearsal:** `python -m app.seed --demo` adds
illustrative claims and trades. Delete `app.db` to remove them again.

---

## Later, if you ever outgrow SQLite

**Ignore this section for the project as it stands.** SQLite is the right
choice for a demo: no server, no credentials, nothing that can fail live.

If one day you need a shared database, it is one line and no code changes:

1. `pip install "psycopg[binary]"`
2. In `backend\.env`:
   `DATABASE_URL=postgresql+psycopg://user:password@host:5432/postgres`
3. Restart. Tables create themselves.

Supabase gives you that string under **Project settings → Database →
Connection string → URI**; change the `postgresql://` prefix to
`postgresql+psycopg://`. That is the only edit.
