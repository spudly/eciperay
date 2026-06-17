import {execSync} from 'node:child_process';

const DEV_PORTS = [8080, 8081] as const;

type Device = {id: string; state: string; isEmulator: boolean};

const run = (command: string) =>
  execSync(command, {encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']}).trim();

const listDevices = (): Device[] => {
  const output = run('adb devices -l');
  return output
    .split('\n')
    .slice(1)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const [id, state] = line.split(/\s+/);
      return {
        id: id ?? '',
        state: state ?? '',
        isEmulator: (id ?? '').startsWith('emulator-'),
      };
    })
    .filter(device => device.id && device.state === 'device');
};

const printSetupHelp = () => {
  console.error(`
No physical Android device detected.

1. On your phone: Settings → About phone → tap Build number 7 times
2. Settings → Developer options → enable USB debugging
3. Connect the phone with a USB cable (use a data cable, not charge-only)
4. Accept the "Allow USB debugging?" prompt on the phone
5. macOS: if prompted, allow the computer to access the device

Then verify with:
  adb devices

You should see your phone serial (not emulator-XXXX).

If an emulator is still connected, stop it or disconnect it first.
`);
};

const devices = listDevices();
const emulators = devices.filter(device => device.isEmulator);
const phones = devices.filter(device => !device.isEmulator);

if (phones.length === 0) {
  if (emulators.length > 0) {
    console.error(
      `Found emulator(s): ${emulators.map(device => device.id).join(', ')}`,
    );
    console.error('Stop the emulator and connect a physical device instead.\n');
  }
  printSetupHelp();
  process.exit(1);
}

const preferredId = process.env['ANDROID_SERIAL'];
const phone =
  phones.find(device => device.id === preferredId) ??
  (phones.length === 1 ? phones[0] : null);

if (!phone) {
  console.error('Multiple phones connected. Set ANDROID_SERIAL to one of:');
  for (const device of phones) {
    console.error(`  ${device.id}`);
  }
  process.exit(1);
}

if (emulators.length > 0) {
  console.log(
    `Ignoring emulator(s): ${emulators.map(device => device.id).join(', ')}`,
  );
}

for (const port of DEV_PORTS) {
  run(`adb -s ${phone.id} reverse tcp:${port} tcp:${port}`);
}

console.log(`Using phone ${phone.id}`);
console.log(
  `Port forwarding: phone localhost:${DEV_PORTS.join(',')} → Mac localhost:${DEV_PORTS.join(',')}`,
);
console.log('Physical device ready for React Native dev.');
