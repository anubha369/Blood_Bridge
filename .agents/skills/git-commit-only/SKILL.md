---
name: git-commit-only
description: >-
  Use this skill whenever staging, committing, or saving code changes in the BloodBridge repository.
  Enforces the strict rule that changes must be committed LOCALLY ONLY, and git push is NEVER executed.
---

# Git Commit-Only Workflow

This skill outlines the strict version control workflow for the BloodBridge repository as defined in `GEMINI.md`.

## Golden Rule

> ⛔ **NEVER EXECUTE `git push`** under any circumstance.
> ✅ **ONLY `git commit`** is permitted.

Pushing changes to remote remotes (e.g., GitHub, origin main) is exclusively reserved for the user to perform manually from their own terminal.

## Standard Procedure

When code modifications, bug fixes, or feature implementations are complete and verified:

1. **Verify Code Quality & Builds**:
   - For frontend changes: run `cd frontend && npm run build` to verify 0 syntax or bundle errors.
   - For backend changes: verify syntax with `node -c <file>`.

2. **Stage Modified Files**:
   ```bash
   git add <modified-files>
   ```

3. **Commit Changes Locally**:
   ```bash
   git commit -m "<type>: <concise description of what changed>"
   ```

4. **Synchronize Mirror Repository**:
   - Sync modified files to the mirror at `/Users/annubha/Blood_bridge/`.
   - Run `git add` and `git commit` locally in the mirror repository.

5. **Stop Here**:
   - **DO NOT run `git push`**.
   - Inform the user of the local commit hash and let them know their changes are safely committed locally.
