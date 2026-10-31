---
'@eciperay/web': patch
---

The web profile and feedback surfaces now render the design system pages
(@spudly/ui ProfilePage, FeedbackPage, AccessTokensPanel, NutritionGoalsForm)
instead of the web app's own views — B7 cluster C10 of the web adoption
(design-system#130). The web hosts keep the session, queries, mutations, and the
feedback shortcut's analytics-consent flow (show and re-present consent,
eciperay#256/#299); the feedback form lives in the bubble overlay as the DS
FeedbackPage. Subscription, transfer, and account-data sections remain as
ProfilePage slot content rebuilt on design system widgets, the pay page converts
to direct design system imports, and the retired web views (ProfileView,
AccessTokensView, AccessTokensTokenRow, NutritionGoalsFormView) and the
DestructiveButton/ScreenContainer adapters are removed.
