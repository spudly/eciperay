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
- [ ] when using istanbul-ignore comments it should include a reason
- [ ] never use @ts-ignore or @ts-expecte-error
- [ ] when using eslint ignore comments it should include a reason
- [ ] when using c8 ignore comments it should include a reason
- [ ] rich text recipe input
- [ ] vite port should come from .env
- [ ] why are we using vitest instead of jest for packages/web
