---
'@eciperay/web': patch
---

The web component showcase is retired (B7 cluster C2, design-system#130): the
dev-only `/dev/components` route, the showcase page and its picker/demo
components, and the `@eciperay/client` showcase catalog and demo types are
removed, along with the profile screen's Component Showcase entry point. The
design system Storybooks are the component showcase now. No production behavior
changes — the showcase route only ever existed in development builds.
