# The database — a guide from zero

You have never used SQLite. That is fine, because **there is nothing to
install, no server to start, no username, no password, and no connection to
set up.** This page explains what exists, how to look at it, and how to put
your own data in.

---

## 1. What SQLite actually is

Most databases (MySQL, Postgres) are *programs* that run in the background.
You install them, start them, and connect over a network with a username and
password.

**SQLite is not a program. It is a single file.**

Your entire database is this one file:

```
C:\Users\lisam\carbon-credit\backend\data\app.db
```

Copy that file and you have copied the whole database. Delete it and the
database is gone (the app rebuilds an empty one on the next start). Email it
to a teammate and they have your exact data.

That is the whole idea. There is nothing else to it.

## 2. Is it already connected?

**Yes.** It was connected before you asked. `backend/app/db.py` opens that
file on startup and `backend/app/models.py` defines the four tables:

| Table | Holds |
|---|---|
| `users` | The profiles you log in as |
| `claims` | Every action logged, and its status |
| `verifications` | What the verification pipeline returned |
| `swaps` | Trade requests between users |

If you started the backend and logged in, you have already used it.

There is **one deliberate exception**: credit balances are *not* stored here.
They are read from the ledger every time. If the database and the ledger ever
disagreed, the product would look broken, so there is only one source of
truth.

## 3. How to look inside it

Pick whichever you prefer. All three show the same file.

### Option A — VS Code (easiest, you already have it)

1. Open the Extensions panel (`Ctrl+Shift+X`)
2. Search **SQLite Viewer** and install it
3. In the file explorer, click `backend/data/app.db`

It opens as a table you can read. No commands.

### Option B — DB Browser for SQLite (a real GUI)

1. Download from <https://sqlitebrowser.org> and install
2. **Open Database** → choose `backend\data\app.db`
3. **Browse Data** tab → pick a table from the dropdown

This one also lets you **edit rows by hand and click Write Changes**, which
is the easiest way to put real data in without writing code.

### Option C — the command line, no install

Python ships with SQLite built in, so this works right now:

```powershell
cd C:\Users\lisam\carbon-credit\backend
.venv\Scripts\Activate.ps1
python -c "import sqlite3; c=sqlite3.connect('data/app.db'); [print(r) for r in c.execute('SELECT id, name FROM users')]"
```

## 4. How to put your own data in

### The easy way — DB Browser

Open the file, **Browse Data**, choose the table, click **New Record**, type
the values, then **Write Changes**. Done.

### The repeatable way — a small script

Better if you will do it more than once, because you can re-run it. Create
`backend/load_data.py`:

```python
"""Load real data. Run:  python load_data.py"""
from sqlmodel import Session
from app.db import engine, create_db_and_tables
from app.models import User

create_db_and_tables()

with Session(engine) as session:
    session.add(User(
        name="Ananya",
        wallet_address="0xabc123...",
    ))
    session.commit()
    print("added")
```

Run it with the virtual environment active:

```powershell
cd C:\Users\lisam\carbon-credit\backend
.venv\Scripts\Activate.ps1
python load_data.py
```

`id` and `created_at` fill themselves in, so you only supply the real values.

### Starting completely fresh

```powershell
# stop the backend first, then:
Remove-Item C:\Users\lisam\carbon-credit\backend\data\app.db
```

Next start recreates the file with the four login profiles and **no claims**.

## 5. About the sample data

Sample claims and trades are **no longer created automatically**. A fresh
database contains only the four login profiles, because the login screen
needs someone to log in as.

If you want the illustrative data back — for a rehearsal, or to see the
screens populated:

```powershell
cd C:\Users\lisam\carbon-credit\backend
.venv\Scripts\Activate.ps1
python -m app.seed --demo
```

To go back to profiles only, delete `app.db` and restart.

## 6. If you later want Postgres or Supabase

You do not need this for the demo, and I would not do it before the
presentation — it adds an account, a network dependency and credentials that
can all fail live. SQLite has none of those failure modes.

But when you do want it, it is one line and **no code changes**:

1. Install the driver:
   ```powershell
   pip install "psycopg[binary]"
   ```
2. Create `backend\.env` (copy `backend\.env.example`) and set:
   ```
   DATABASE_URL=postgresql+psycopg://user:password@host:5432/postgres
   ```
3. Restart the backend. The tables create themselves on first start.

**For Supabase specifically:** in your project go to
**Project settings → Database → Connection string → URI**, copy it, and
change the `postgresql://` prefix to `postgresql+psycopg://`. That is the
only edit.

The application code is identical either way — SQLModel speaks both.
