---
'@eciperay/web': patch
---

The web app shell and banners are rebuilt on the design system (B7 cluster
C12, design-system#130): AppShell takes its styling from @spudly/ui tokens,
AnalyticsConsentBanner and MobileAppInstallBanner render the design system
FixedActionBanner (the local adapter is retired), and Tailwind is removed
from the web package — every remaining utility class across the shell,
banners, and host slot components is replaced by design-system
components/tokens or plain styles. No behavior changes.
