---
'@eciperay/web': patch
---

The web auth pages (sign in, sign up, forgot password, reset password) now
render the design system auth pages (@spudly/ui SignInPage, SignUpPage,
ForgotPasswordPage, ResetPasswordPage) instead of the web app's own views — B7
cluster C3 of the web adoption (design-system#130). The web hosts keep routing,
session handling, and the post-submit confirmation states; the sign-up page
keeps the web legal-links notice in the design system page's legal slot. Field
labels and button copy follow the design system pages ("Your name", "Create
Account", "Send Reset Link"), matching the native app.
