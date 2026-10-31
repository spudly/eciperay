---
'@eciperay/web': patch
---

The web Add & create flows now render the design system pages (@spudly/ui)
instead of the web app's own views — B7 cluster C4 (design-system#130): the
add-recipe menu renders AddRecipeMenuPage, the four import steps render
ImportTextPage / ImportUrlPage / ImportImagePage / ImportReviewPage, and both AI
routes render AiSessionPage through a web session host that keeps the state
machine and mutations web-side. Two visible deltas come with the design system
contracts the native app already ships: text import pastes into a plain text
field instead of a rich-text editor, and image import offers the app's Take
Photo / Choose from Library actions (both open a file picker on the web; Take
Photo asks mobile browsers for the camera).
