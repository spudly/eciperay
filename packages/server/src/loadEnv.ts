import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {config} from 'dotenv';

// Resolve relative to this file (packages/server/src/) so the root .env is
// always found regardless of the process working directory.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
config({path: resolve(root, '.env'), quiet: true});
