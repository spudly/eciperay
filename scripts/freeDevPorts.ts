import {execSync} from 'node:child_process';

const ports = process.argv
  .slice(2)
  .map(Number)
  .filter(port => port > 0);

if (ports.length === 0) {
  process.exit(0);
}

for (const port of ports) {
  try {
    const pids = execSync(`lsof -ti tcp:${port}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
      .trim()
      .split('\n')
      .filter(Boolean);

    for (const pid of pids) {
      execSync(`kill -9 ${pid}`, {stdio: 'ignore'});
      console.log(`Freed port ${port} (pid ${pid})`);
    }
  } catch {
    // Port already free.
  }
}
