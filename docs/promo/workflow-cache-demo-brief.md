# CacheKey workflow cache demo brief

## Demo angle

Show how CacheKey reviews GitHub Actions cache configuration offline, turning risky restore keys and cache paths into Markdown or JSON evidence.

## 60 second flow

1. Run `bash demo/run-workflow-cache-demo.sh`.
2. Open `tmp/workflow-cache-demo/risky.md` to show human-readable findings for the risky workflow fixture.
3. Open `tmp/workflow-cache-demo/safe.json` to show the same scanner output shape for automation.
4. Mention that `cachekey scan` is read-only and does not call GitHub APIs.
5. Close with a CI use case: publish the report as a pull request artifact before changing cache policy.

## Useful hooks

- "CI cache keys are configuration, so review them like code."
- "Catch broad restore keys before stale dependencies leak across branches."
- "CacheKey gives agents a local map of cache risk without touching GitHub."

## Verification for the demo

Run:

```bash
bash demo/run-workflow-cache-demo.sh
```

The script builds the CLI, scans risky and safe workflow fixtures, writes Markdown and JSON reports, and checks for expected report fields.
