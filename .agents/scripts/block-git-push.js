#!/usr/bin/env node
/**
 * BloodBridge Lifecycle Hook: block-git-push
 * Hard blocks any tool call that attempts to execute `git push`.
 * Enforces GEMINI.md policy: "Only git commit is allowed. Never git push."
 */

let rawInput = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  rawInput += chunk;
});

process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(rawInput);
    const command = payload?.toolCall?.args?.CommandLine || '';

    // Match any variant of git push (e.g. git push, git push origin, git push -u, etc.)
    if (/\bgit\s+push\b/i.test(command)) {
      const denyResponse = {
        decision: 'deny',
        reason: "BLOCKED: 'git push' is strictly forbidden by GEMINI.md project policy. Only local 'git commit' is allowed. Please ask the user to push manually if desired."
      };
      process.stdout.write(JSON.stringify(denyResponse));
      process.exit(0);
    }

    // Allow all other commands
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  } catch (err) {
    // Fail-safe fallback to allow standard operations
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  }
});
