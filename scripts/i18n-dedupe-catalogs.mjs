// Dedupe the Lingui .po catalogs across the web and app hosts (#681).
//
// The strings both hosts render identically live ONCE in the shared core
// catalog (@eciperay/client, packages/client/src/i18n/locales). Each host's
// own catalog holds only its host-specific strings. A msgid whose msgstr
// DIFFERS between the hosts is a host variant, not a shared string: it stays
// in both host catalogs on purpose (see packages/client/src/i18n/README.md).
//
// Run after either host's `i18n:extract` (wired into both hosts' scripts and
// as the root `i18n:dedupe` script): any msgid that extraction (re)created in
// both host catalogs with an identical msgstr moves into the core catalog and
// is removed from both hosts; a copy of a core msgid reappearing in a host
// catalog with the core's msgstr is removed from the host.

import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

export const LOCALES = ['en-US', 'en-XA'];

export const catalogPaths = (root) => ({
  core: (locale) => join(root, 'packages/client/src/i18n/locales', locale, 'messages.po'),
  web: (locale) => join(root, 'packages/web/src/i18n/locales', locale, 'messages.po'),
  app: (locale) => join(root, 'packages/app/src/i18n/locales', locale, 'messages.po'),
});

const STRING_RE = /"((?:[^"\\]|\\.)*)"/g;

const decodePoString = (raw) =>
  raw.replace(/\\(.)/g, (_m, ch) => ({n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\'})[ch] ?? ch);

const readField = (block, field) => {
  const match = new RegExp(`^${field}\\s+("(?:[^"\\\\]|\\\\.)*"(?:\\n"(?:[^"\\\\]|\\\\.)*")*)`, 'm').exec(block);
  if (!match) return null;
  return [...match[1].matchAll(STRING_RE)].map((part) => decodePoString(part[1])).join('');
};

/** Parse .po text into {header, entries: [{msgid, msgstr, block}]}. */
export const parsePo = (text) => {
  const blocks = text.split('\n\n').filter((block) => block.trim() !== '');
  let header = '';
  const entries = [];
  for (const block of blocks) {
    const msgid = readField(block, 'msgid');
    if (msgid === null) throw new Error(`Unparseable .po block: ${block.slice(0, 80)}`);
    if (msgid === '') header = block;
    else entries.push({msgid, msgstr: readField(block, 'msgstr') ?? '', block});
  }
  return {header, entries};
};

export const serializePo = ({header, entries}) =>
  [header, ...entries.map((entry) => entry.block)].join('\n\n') + '\n';

/**
 * The catalog-split invariant (#681): no msgid lives in the core catalog and
 * a host catalog at once, and a msgid present in both host catalogs must be a
 * host variant (different msgstr per host). Returns a list of violations.
 */
export const findCatalogViolations = ({core, web, app}) => {
  const violations = [];
  const coreIds = new Set(core.entries.map((entry) => entry.msgid));
  for (const [name, host] of [['web', web], ['app', app]]) {
    for (const entry of host.entries) {
      if (coreIds.has(entry.msgid)) {
        violations.push(`${entry.msgid} is in both the core catalog and the ${name} catalog`);
      }
    }
  }
  const webById = new Map(web.entries.map((entry) => [entry.msgid, entry.msgstr]));
  for (const entry of app.entries) {
    if (webById.has(entry.msgid) && webById.get(entry.msgid) === entry.msgstr) {
      violations.push(`${entry.msgid} is identical in both host catalogs; it belongs in the core catalog`);
    }
  }
  return violations;
};

/** Move identically-shared host msgids into core; drop host copies of core msgids. */
export const dedupeCatalogs = ({core, web, app}) => {
  const coreById = new Map(core.entries.map((entry) => [entry.msgid, entry]));
  const webById = new Map(web.entries.map((entry) => [entry.msgid, entry]));
  const moved = [];
  const nextCore = [...core.entries];
  for (const entry of app.entries) {
    const webEntry = webById.get(entry.msgid);
    if (webEntry && webEntry.msgstr === entry.msgstr && !coreById.has(entry.msgid)) {
      nextCore.push(webEntry);
      moved.push(entry.msgid);
    }
  }
  const movedIds = new Set(moved);
  const keep = (host) =>
    host.entries.filter((entry) => {
      const coreEntry = coreById.get(entry.msgid);
      if (coreEntry && coreEntry.msgstr === entry.msgstr) return false;
      return !movedIds.has(entry.msgid);
    });
  return {
    core: {header: core.header, entries: nextCore},
    web: {header: web.header, entries: keep(web)},
    app: {header: app.header, entries: keep(app)},
    moved,
  };
};

const main = () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const paths = catalogPaths(root);
  for (const locale of LOCALES) {
    const read = (path) => parsePo(readFileSync(path, 'utf8'));
    const before = {core: read(paths.core(locale)), web: read(paths.web(locale)), app: read(paths.app(locale))};
    const after = dedupeCatalogs(before);
    for (const name of ['core', 'web', 'app']) {
      const text = serializePo(after[name]);
      if (text !== readFileSync(paths[name](locale), 'utf8')) writeFileSync(paths[name](locale), text);
    }
    console.log(
      `${locale}: core ${after.core.entries.length}, web ${after.web.entries.length}, app ${after.app.entries.length}` +
        (after.moved.length ? ` (moved to core: ${after.moved.join(', ')})` : ''),
    );
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
