// Lingui catalogs are imported as .po files and compiled on the fly by
// the app's Metro transformer (#588); there is no committed compiled catalog.
declare module '*.po' {
  import type {Messages} from '@lingui/core';
  export const messages: Messages;
}
