import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export type ExecSync = typeof execSync;

export const freePorts = (ports: number[], exec: ExecSync): void => {
  if (ports.length === 0) {
    return;
  }

  for (const port of ports) {
    try {
      const pids = exec(`lsof -ti tcp:${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      })
        .trim()
        .split('\n')
        .filter(Boolean);

      for (const pid of pids) {
        exec(`kill -9 ${pid}`, {stdio: 'ignore'});
        console.log(`Freed port ${port} (pid ${pid})`);
      }
    } catch {
      // Port already free.
    }
  }
};

export const parsePortArgs = (argv: string[]): number[] =>
  argv
    .slice(2)
    .map(Number)
    .filter(port => port > 0);

export const isDirectRun = (
  argv: string[] = process.argv,
  modulePath: string = fileURLToPath(import.meta.url),
): boolean => {
  const entry = argv[1];
  if (!entry) {
    return false;
  }
  return modulePath === entry;
};

export const runFreeDevPortsCli = (
  argv: string[] = process.argv,
  exec: ExecSync = execSync,
): void => {
  freePorts(parsePortArgs(argv), exec);
};

export const maybeRunFreeDevPortsCli = (
  directRun: boolean = isDirectRun(),
  run: () => void = runFreeDevPortsCli,
): void => {
  if (directRun) {
    run();
  }
};

maybeRunFreeDevPortsCli();
