import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const DEV_PORTS = [8080, 8081] as const;

export type Device = {id: string; state: string; isEmulator: boolean};

export type ExecSync = typeof execSync;

export const parseAdbDevices = (output: string): Device[] =>
  output
    .split('\n')
    .slice(1)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const [id = '', state = ''] = line.split(/\s+/);
      return {id, state, isEmulator: id.startsWith('emulator-')};
    })
    .filter(device => device.id && device.state === 'device');

export const selectPhone = (
  devices: Device[],
  preferredId: string | undefined,
): {phone: Device | null; emulators: Device[]; phones: Device[]} => {
  const emulators = devices.filter(device => device.isEmulator);
  const phones = devices.filter(device => !device.isEmulator);

  if (phones.length === 0) {
    return {phone: null, emulators, phones};
  }

  const matchedPhone = phones.find(device => device.id === preferredId);
  if (matchedPhone) {
    return {phone: matchedPhone, emulators, phones};
  }

  if (phones.length === 1) {
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style -- filter() yields a dense array when length is 1
    return {phone: phones[0] as Device, emulators, phones};
  }

  return {phone: null, emulators, phones};
};

export const printSetupHelp = (): void => {
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

export type SetupDeviceResult =
  | {ok: true; phone: Device}
  | {ok: false; reason: 'no_phone' | 'multiple_phones'; phones: Device[]};

const failWithoutPhone = (
  emulators: Device[],
  phones: Device[],
): SetupDeviceResult => {
  if (emulators.length > 0) {
    console.error(
      `Found emulator(s): ${emulators.map(device => device.id).join(', ')}`,
    );
    console.error('Stop the emulator and connect a physical device instead.\n');
  }
  if (phones.length === 0) {
    printSetupHelp();
    return {ok: false, reason: 'no_phone', phones};
  }
  console.error('Multiple phones connected. Set ANDROID_SERIAL to one of:');
  for (const device of phones) {
    console.error(`  ${device.id}`);
  }
  return {ok: false, reason: 'multiple_phones', phones};
};

export const setupDevice = (
  devices: Device[],
  preferredId: string | undefined,
): SetupDeviceResult => {
  const {phone, emulators, phones} = selectPhone(devices, preferredId);

  if (!phone) {
    return failWithoutPhone(emulators, phones);
  }

  if (emulators.length > 0) {
    console.log(
      `Ignoring emulator(s): ${emulators.map(device => device.id).join(', ')}`,
    );
  }

  return {ok: true, phone};
};

export const runAdbReverse = (
  phoneId: string,
  ports: readonly number[],
  exec: ExecSync,
): void => {
  for (const port of ports) {
    exec(`adb -s ${phoneId} reverse tcp:${port} tcp:${port}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }
};

export const listDevices = (exec: ExecSync): Device[] => {
  const output = exec('adb devices -l', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
  return parseAdbDevices(output);
};

export const runSetupAndroidDevice = (
  exec: ExecSync,
  preferredId: string | undefined,
): number => {
  const result = setupDevice(listDevices(exec), preferredId);
  if (!result.ok) {
    return 1;
  }

  runAdbReverse(result.phone.id, DEV_PORTS, exec);
  console.log(`Using phone ${result.phone.id}`);
  console.log(
    `Port forwarding: phone localhost:${DEV_PORTS.join(',')} → Mac localhost:${DEV_PORTS.join(',')}`,
  );
  console.log('Physical device ready for React Native dev.');
  return 0;
};

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

export const runSetupAndroidDeviceCli = (
  exec: ExecSync = execSync,
  preferredId: string | undefined = process.env['ANDROID_SERIAL'],
): never => {
  process.exit(runSetupAndroidDevice(exec, preferredId));
};

export const maybeRunSetupAndroidDeviceCli = (
  directRun: boolean = isDirectRun(),
  run: () => never = runSetupAndroidDeviceCli,
): void => {
  if (directRun) {
    run();
  }
};

maybeRunSetupAndroidDeviceCli();
