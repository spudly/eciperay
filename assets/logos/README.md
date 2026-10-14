# Eciperay logos

Source artwork lives in `master/` with `{{token}}` placeholders. Theme colors
and variant definitions are in `themes.yaml` and `variants.yaml`.

Build generated assets (SVG variants, PNG sizes, and web copies):

```bash
npm run build:logos
```

Output is written to `generated/` (gitignored). The legacy hand-edited
`logo.svg` and `logo-text.svg` files in this directory are superseded by the
build pipeline; edit `master/mark.svg` and `master/wordmark.svg` instead.
