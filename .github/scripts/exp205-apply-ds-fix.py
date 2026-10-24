#!/usr/bin/env python3
"""EXPERIMENT ONLY (#205 fix verification, throwaway branch): rewrite
the installed @spudly/ui 1.4.0 RecipesPage dist in place with the
design-system fix (flexWrap + 60dp flexBasis on the row's text block),
wherever the workspace install put it. The real fix ships in
@spudly/ui itself; this only proves it on the emulator."""
import pathlib, sys

root = pathlib.Path.cwd()
targets = []
for pkg in root.rglob("node_modules/@spudly/ui/package.json"):
    try:
        import json
        if json.loads(pkg.read_text()).get("version") == "1.4.0":
            f = pkg.parent / "dist/pages/RecipesPage.js"
            if f.exists():
                targets.append(f)
    except Exception:
        pass

if not targets:
    sys.exit("no @spudly/ui 1.4.0 RecipesPage.js found")

for f in targets:
    s = f.read_text()
    a = "const textBlockStyle = { flex: 1, minWidth: 0 };"
    b = "const textBlockStyle = { flexGrow: 1, flexShrink: 1, flexBasis: 60, minWidth: 0 };"
    c = 'variant: "elevated", flexDirection: "row",'
    d = 'variant: "elevated", flexDirection: "row", flexWrap: "wrap",'
    assert a in s and c in s, f"expected source not found in {f}"
    f.write_text(s.replace(a, b).replace(c, d))
    print(f"patched {f}")
