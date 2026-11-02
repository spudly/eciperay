---
'@eciperay/app': patch
'@eciperay/web': patch
---

Web and app icons now render through the design system: both hosts' `Icon`
components map the app's icon names onto the semantic components from
`@spudly/ui/icons` (Home, Recipes, Shared, Add, Tags, Profile, Meals, Warning,
Feedback) instead of `react-icons` (web) and `react-native-vector-icons` (app).
The `@eciperay/icons` package is removed; the tab-to-icon mapping stays
app-owned and now lives in `packages/app/src/navigation/tabIcons.ts`. Same
glyphs, sizes, colors, and accessibility labels — no visible change intended.
