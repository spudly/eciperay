// Catalog-split invariant for the shared core i18n catalog (#681): the .po
// files shipped in @eciperay/client and the two hosts must parse, and no
// msgid may be defined in more than one place — except a host variant, a
// msgid both hosts carry with a DIFFERENT msgstr (per-host copy for the same
// string id), which stays in both host catalogs on purpose.
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

const root = join(__dirname, '..');

const loadModule = () => import('./i18n-dedupe-catalogs.mjs');

const readCatalog = (mod, relativePath) => mod.parsePo(readFileSync(join(root, relativePath), 'utf8'));

describe('shared core i18n catalogs (#681)', () => {
  it.each(['en-US', 'en-XA'])('keeps the %s split exact: core + hosts, no duplicates', async (locale) => {
    const mod = await loadModule();
    const catalogs = {
      core: readCatalog(mod, `packages/client/src/i18n/locales/${locale}/messages.po`),
      web: readCatalog(mod, `packages/web/src/i18n/locales/${locale}/messages.po`),
      app: readCatalog(mod, `packages/app/src/i18n/locales/${locale}/messages.po`),
    };
    expect(catalogs.core.entries.length).toBeGreaterThan(0);
    expect(mod.findCatalogViolations(catalogs)).toEqual([]);
  });

  it('parses entries and rejects unparseable blocks', async () => {
    const mod = await loadModule();
    const parsed = mod.parsePo('msgid ""\nmsgstr ""\n\nmsgid "a.b"\nmsgstr "Bee"\n');
    expect(parsed.entries).toEqual([{msgid: 'a.b', msgstr: 'Bee', block: 'msgid "a.b"\nmsgstr "Bee"'}]);
    expect(() => mod.parsePo('not a catalog')).toThrow('Unparseable .po block');
  });

  it('dedupes identically shared msgids into the core catalog', async () => {
    const mod = await loadModule();
    const catalog = (entries) => ({header: 'msgid ""\nmsgstr ""', entries});
    const entry = (msgid, msgstr) => ({msgid, msgstr, block: `msgid "${msgid}"\nmsgstr "${msgstr}"`});
    const result = mod.dedupeCatalogs({
      core: catalog([entry('core.only', 'Core')]),
      web: catalog([entry('shared.id', 'Same'), entry('variant.id', 'Web'), entry('core.only', 'Core')]),
      app: catalog([entry('shared.id', 'Same'), entry('variant.id', 'App')]),
    });
    expect(result.moved).toEqual(['shared.id']);
    expect(result.core.entries.map((e) => e.msgid)).toEqual(['core.only', 'shared.id']);
    expect(result.web.entries.map((e) => e.msgid)).toEqual(['variant.id']);
    expect(result.app.entries.map((e) => e.msgid)).toEqual(['variant.id']);
    expect(mod.findCatalogViolations(result)).toEqual([]);
  });
});
