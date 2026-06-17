- [x] Create github actions workflow for testing PRs/commits
- [x] For each eslint rule that is disabled - it should have an inline comment
      indicating why it is disabled
- [x] run type check on precommit
- [x] "design principle" rules are under typescript section of eslint config for
      some reason. core eslint rules should be at the top unless they are
      overriding base rules
- [x] object keys should be quoted consistently
- [x] console should be forbidden except in scripts
- [ ] Local dev requires Docker (Supabase CLI) which isn't available — use a
      cloud Supabase project for development instead. Consider mocking auth/db
      for unit tests.
- [x] rename the "shared" package to "types" because that's all it has in it
- [x] use zod for parsing data from external sources (user input, api endpoint
      response data, AI responses, etc.)
- [x] ensure packages share (or extend) the same configs as the workspace
      (eslint, jest, etc.)
- [x] use jest monorepo features (projects?)
- [x] use typescript monorepo features (project references?)
- [x] use turbo for fast monorepo management
- [x] create a repo-level start script that starts both the server and the app
      (both android and ios at the same time if that's possible)
- [x] when using istanbul-ignore comments it should include a reason - use
      eslint to enforce
- [x] never use @ts-ignore or @ts-expecte-error - use eslint to enforce
- [x] when using eslint ignore comments it should include a reason - use eslint
      to enforce
- [x] when using c8 ignore comments it should include a reason - use eslint to
      enforce
- [x] support rich text recipe import - I should be able to paste rich text
      (from word documents, html pages, etc) and it'll parse that data. Any
      missing data should be computed using AI
- [x] vite port (8081) should come from .env
- [x] why are we using vitest instead of jest for packages/web
- [x] make tests fail on console.error
- [x] use clsx for constructing className props
- [ ] option to support scale 2x, 3x, etc. instead of # servings
- [ ] when scaling, cooking mode should use scaled amounts
- [x] on android the email/password fields have no labels
- [x] on android the password field text is either white or transparent so I
      can't see it
- [x] on android when I attempt to login with correct credentials I get "Sign in
      failed Invalid login credentials"
- [ ] on android "Home" page it says "your recipes will appear here" but shows
      no recipes. If I click on the Recipes tab I do see them.
- [ ] reset password doesn't work as expected. link from email takes me to
      localhost:3000, and if I change the url to the correct port it shows me a
      page that says "welcome to react native"
- [ ] recipe image/description AI generation not available on android - should
      be available everywhere
- [ ] recipe reorder for ingredients/instruction is not available on android -
      should be available everywhere
- [ ] recipe reorder should be drag&drop everywhere, not buttons
- [x] rename to Eciperay (eciperay.com)
- [ ] setup web hosting on fly.io
