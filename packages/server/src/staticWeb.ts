import {existsSync, readFile} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  buildPublicPageHead,
  CONSENT_PREFERENCES_PATH,
} from '@eciperay/client/pageHead';
import express, {type Express, type Request, type Response} from 'express';

import {API_PREFIX} from './apiPrefix.js';

const serverSrcDir = path.dirname(fileURLToPath(import.meta.url));

export const WEB_DIST_DIR = path.resolve(serverSrcDir, '../../web/dist');

export const isWebDistAvailable = (): boolean => existsSync(WEB_DIST_DIR);

export const attachWebStatic = (app: Express, distDir = WEB_DIST_DIR): void => {
  app.use(express.static(distDir, {fallthrough: true, index: false}));

  app.use((req: Request, res: Response, next) => {
    if (req.path.startsWith(API_PREFIX)) {
      next();
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    // The consent preferences page must carry its noindex directive in
    // the SERVED HTML (#614): crawlers that never execute the client
    // bundle would otherwise see only the home-page head in index.html.
    // The directive comes from the same shared head builder the client
    // head components consume, so the two never fork.
    if (req.path === CONSENT_PREFERENCES_PATH) {
      const head = buildPublicPageHead('', CONSENT_PREFERENCES_PATH);
      readFile(path.join(distDir, 'index.html'), 'utf8', (error, html) => {
        if (error || !head || !html.includes('</head>')) {
          res.sendFile(path.join(distDir, 'index.html'), next);
          return;
        }
        res
          .type('html')
          .send(
            html.replace(
              '</head>',
              `  <meta name="robots" content="${head.robots}" />\n  </head>`,
            ),
          );
      });
      return;
    }
    res.sendFile(path.join(distDir, 'index.html'), next);
  });
};
