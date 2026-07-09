# RTK - Rust Token Killer (Kilo Code)

**Usage**: Token-optimized CLI proxy for shell commands.

## Rule

Always prefix shell commands with `rtk` to minimize token consumption.

## Strict Enforcement

This rule is mandatory for every terminal command in this repository.

The agent must not execute raw shell commands directly.

Before executing a command, perform this mental rewrite:

- `git status` -> `rtk git status`
- `git diff` -> `rtk git diff`
- `npm run build` -> `rtk npm run build`
- `npm test` -> `rtk npm test`
- `dir` -> `rtk dir`
- `type file` -> `rtk type file`
- `cat file` -> `rtk cat file`
- `ls` -> `rtk ls`

If the user asks for a command without mentioning RTK, still use RTK automatically.

User says:
- "cek status git"

Agent must run:
- `rtk git status`

Agent must never run:
- `git status`

If `rtk <command>` fails, use:
- `rtk proxy <command>`

Do not fall back to raw commands unless both RTK and RTK proxy fail.

Examples:

```bash
rtk git status
rtk cargo test
rtk ls src/
rtk grep "pattern" src/
rtk find "*.rs" .
rtk docker ps
rtk gh pr list
```

## Meta Commands

```bash
rtk gain              # Show token savings
rtk gain --history    # Command history with savings
rtk discover          # Find missed RTK opportunities
rtk proxy <cmd>       # Run raw (no filtering, for debugging)
```

## Why

RTK filters and compresses command output before it reaches the LLM context, saving 60-90% tokens on common operations. Always use `rtk <cmd>` instead of raw commands.
