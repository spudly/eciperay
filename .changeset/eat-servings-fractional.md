---
'@eciperay/server': patch
'@eciperay/mcp-server': patch
'@eciperay/client': patch
---

Allow servings-to-eat of 0 and fractional servings (such as 0.5 or 1.5) for meal
members, direct ingredients, and meal-plan recipe entries, so an entry someone
eats none of — or only part of a serving of — no longer has to be entered as a
whole serving. Nutrition now scales by the exact amount eaten: an entry set to
eat 0 contributes nothing, and eating half a serving contributes half.
