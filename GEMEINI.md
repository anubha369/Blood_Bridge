# GEMINI.md - BloodBridge Project Rules & Agent Directives

> **CRITICAL POLICY (ALWAYS ACTIVE ON EVERY PROMPT)**
> 
> ⛔ **NEVER RUN `git push` UNDER ANY CIRCUMSTANCES.**
> ✅ **ONLY `git commit` (LOCAL COMMITS) IS PERMITTED.**
>
> All code changes must be staged and committed **locally only**. Never attempt `git push`, `git push origin ...`, `git push -u`, or chaining commands with `git push`. Pushing to the remote repository is strictly reserved for the USER to execute manually.

---

## 1. Git Workflow & Version Control Rules

1. **Commit-Only Policy**:
   - After completing, verifying, or refactoring code, stage changes using `git add <files>`.
   - Create clear, semantic local commits using `git commit -m "<type>: <concise description>"`.
   - **NEVER execute `git push`**.
   - If the user asks whether changes are pushed, inform them that changes are safely committed locally and provide the exact command for them to push manually (e.g., `git push origin main`).

2. **Automated Safety Gate**:
   - An active lifecycle hook is configured in `.agents/hooks.json` that intercepts `run_command` and hard-blocks any command containing `git push`.
   - Even if requested or tempted to push, the agent must adhere to this rule.

3. **Dual-Repository Local Synchronization**:
   - This workstation has two mirrors of the repository:
     - Primary: `/Users/annubha/Desktop/Blood_bridge`
     - Mirror: `/Users/annubha/Blood_bridge`
   - When project code changes are made, keep both working trees synchronized and committed locally:
     ```bash
     # Example: Sync and commit locally in both repos without pushing
     cd /Users/annubha/Desktop/Blood_bridge && git add . && git commit -m "..."
     cd /Users/annubha/Blood_bridge && git add . && git commit -m "..."
     # DO NOT RUN git push
     ```

---

## 2. Project Architecture & Standards

- **Frontend (`frontend/`)**:
  - React 18 with Vite, Tailwind CSS, Lucide React icons.
  - Build validation: Always run `npm run build` in `frontend/` to confirm 0 compilation errors before finalizing tasks.
  - Responsive, mobile-first design; keep dark/light contrast consistent with healthcare aesthetics.

- **Backend (`backend/`)**:
  - Node.js & Express running on port `5001`.
  - Database: Live PostgreSQL on Supabase with PostGIS spatial extension.
  - Always verify syntax (`node -c <file>`) before restarting backend services.
  - Google Places API (New) proxy with resilient offline curated Indian hospital fallback.
  - Telegram Bot integration (`@Blood_Bridgebot`) for donor dispatching.

- **Mobile (`mobile/`)**:
  - React Native / Expo application for Android & iOS donors and coordinators.

---

## 3. Communication & Tone Guidelines

- Keep responses concise, professional, and directly actionable.
- Always provide clickable GitHub-style file links (`[file.jsx](file:///path/to/file.jsx)`).
- Summarize local commit hashes and changes clearly.
- Respect user privacy, credentials, and never bypass sandbox or safety guardrails.
