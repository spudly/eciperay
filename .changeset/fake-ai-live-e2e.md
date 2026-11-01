---
'@eciperay/server': patch
---

The server gains an opt-in fake Anthropic transport for QA environments, enabled
by setting ECIPERAY_AI_FAKE=1. With the flag on, the Anthropic client answers
from deterministic canned responses (recipe import parsing, tag selection,
nutrition estimates, recipe descriptions, substitutions, step timing) instead of
calling the real API, so the live Playwright QA suite exercises the AI-backed
flows without consuming API credits (issue #336). The flag is off by default and
production behavior is unchanged.
