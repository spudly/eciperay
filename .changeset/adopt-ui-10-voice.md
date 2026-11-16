---
'@eciperay/server': patch
'@eciperay/mcp-server': patch
'@eciperay/web': patch
'@eciperay/app': patch
'@eciperay/client': patch
---

Adopt @spudly/ui 10.0.0 and supply the Eciperay voice at the app root: shared
design-system screens and controls now speak in Eciperay's own warm, encouraging
voice — plain where a label should be plain, and plain in errors — on both web
and native. The temporary ScreenContainer patch is gone, replaced by the design
system's durable fix.
