---
'@eciperay/web': patch
---

The web public surfaces now render the design system's public pages instead
of the web app's own implementations (B7 web adoption, design-system#130):
Discover renders DiscoverPage — filters start collapsed behind the page's
"Add a filter" chooser, more recipes load when the list is scrolled to the
end, and a failed first load now shows an error message instead of spinning
forever; the public recipe page renders PublicRecipePage as a single scroll
(no tabs) with its sign-up / clone / get-the-app actions; the privacy policy
and terms of service render LegalDocumentPage from structured content data
inside the full public frame (footer included); and the signed-out landing
renders LandingPage. All four surfaces share the design system's
PublicPageFrame chrome.
