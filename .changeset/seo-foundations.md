---
'@eciperay/client': patch
'@eciperay/server': patch
'@eciperay/web': patch
---

SEO foundations (#414): every page now draws its title, description, canonical
URL, and Open Graph / Twitter values from one shared head config in
@eciperay/client — full social cards for public pages (home, Discover, public
recipes, privacy, terms), title + noindex only for authenticated pages, and no
share image emitted when a page has none. The sitemap now includes the static
public pages alongside public recipes and is cached for five minutes with a
matching Cache-Control header, and robots.txt now disallows every authenticated
and app-internal path (meals, meal plans, pay, and the rest) while allowing the
public pages and referencing the sitemap.
