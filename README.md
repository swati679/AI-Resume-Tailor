# Resume Tailor

A small personal tool: paste your base resume + a job description (+ optional company name and extra instructions), and it rewrites your resume to match the role, then renders it in a print-ready template.

## How it works

- `index.html` — the frontend UI. Stores your base resume in the browser (`localStorage`).
- `api/tailor.js` — a serverless backend function that holds your API keys and does the actual tailoring:
  - **Groq** (`GROQ_API_KEY`) does the resume rewriting.
  - **Tavily** (`TAVILY_API_KEY`, optional) does a quick company lookup when you enter a company name, used only to inform tone/emphasis, never to invent facts.

Neither key ever touches the browser — the frontend calls `/api/tailor`, which calls Groq/Tavily server-side.

## Push to GitHub

```
git init
git add .
git commit -m "Initial commit: resume tailor app"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## Get your API keys (both free)

- **Groq**: console.groq.com → API Keys → Create API Key
- **Tavily** (optional, only needed for the company-research feature): tavily.com → sign up → key shown on your dashboard (starts with `tvly-`), 1,000 free searches/month, no card required

## Run/deploy with Vercel (recommended, free)

1. Get your API key(s) above.
2. Push this project to GitHub (steps above), if you haven't already.
3. Go to https://vercel.com, sign in with GitHub, click "Add New Project", and import this repo.
4. In the project's Environment Variables settings, add:
   - `GROQ_API_KEY` = your Groq key
   - `TAVILY_API_KEY` = your Tavily key (optional — skip and the company-tone feature just won't run)
5. Deploy. Vercel gives you a live URL (e.g. `resume-tailor.vercel.app`) — that's your app, usable from any device.
6. Every time you `git push`, Vercel redeploys automatically.

## Run locally (optional)

```
npm install -g vercel
vercel dev
```
Add your keys to a `.env` file first:
```
GROQ_API_KEY=gsk_...
TAVILY_API_KEY=tvly-...
```

Then open the URL it prints (usually `http://localhost:3000`).

## Notes

- The model string in `api/tailor.js` (`openai/gpt-oss-120b`) is Groq's current recommended general-purpose model as of mid-2026 — Groq deprecates models periodically, so check console.groq.com/docs/models if you get a "model not found" error.
- Your base resume is stored per-browser (localStorage), not shared across devices.
