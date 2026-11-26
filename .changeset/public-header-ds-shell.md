---
'@eciperay/web': patch
---

Signed-out pages now render through the DS shell chrome (#620): the marketing landing and the public recipe page render inside the one AppShell, whose @spudly/ui AppShellPage renders the DS-owned Eciperay brand mark (`mark: 'eciperay'`) beside the wordmark, the public nav, and a Sign in link, with the shared BigFooter supplied by the shell. The host-owned PublicHeader component is deleted — the signed-out header now carries the brand mark again, completing the #620 header-logo fix alongside the signed-in half.
