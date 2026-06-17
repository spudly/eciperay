import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

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
    res.sendFile(path.join(distDir, 'index.html'), next);
  });
};
