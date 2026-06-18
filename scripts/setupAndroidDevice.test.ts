import {
  DEV_PORTS,
  isDirectRun,
  parseAdbDevices,
  printSetupHelp,
  runAdbReverse,
  runSetupAndroidDevice,
  runSetupAndroidDeviceCli,
  selectPhone,
  setupDevice,
} from './setupAndroidDevice.ts';

const sampleOutput = `List of devices attached
emulator-5554          device product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 device:emu64a transport_id:1
ABC123               device product:pixel model:pixel device:pixel transport_id:2
offline-device       offline transport_id:3
`;

describe('parseAdbDevices', () => {
  it('parses connected devices and skips offline entries', () => {
    expect(parseAdbDevices(sampleOutput)).toEqual([
      {id: 'emulator-5554', state: 'device', isEmulator: true},
      {id: 'ABC123', state: 'device', isEmulator: false},
    ]);
  });

  it('handles malformed device lines', () => {
    expect(parseAdbDevices('List of devices attached\n')).toEqual([]);
    expect(parseAdbDevices('List of devices attached\n   \n')).toEqual([]);
  });
});

describe('selectPhone', () => {
  const devices = parseAdbDevices(sampleOutput);

  it('selects a phone by preferred serial', () => {
    expect(selectPhone(devices, 'ABC123').phone).toEqual({
      id: 'ABC123',
      state: 'device',
      isEmulator: false,
    });
  });

  it('selects the only phone when one is connected', () => {
    const phonesOnly = devices.filter(device => !device.isEmulator);
    expect(selectPhone(phonesOnly).phone).toEqual(phonesOnly[0]);
  });

  it('returns null when multiple phones are connected without preference', () => {
    const phonesOnly = [
      {id: 'A', state: 'device', isEmulator: false},
      {id: 'B', state: 'device', isEmulator: false},
    ];
    expect(selectPhone(phonesOnly).phone).toBeNull();
  });
});

describe('setupDevice', () => {
  it('fails when only emulators are connected', () => {
    const stderrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = setupDevice([
      {id: 'emulator-5554', state: 'device', isEmulator: true},
    ]);
    expect(result).toEqual({ok: false, reason: 'no_phone', phones: []});
    stderrSpy.mockRestore();
  });

  it('fails when multiple phones are connected', () => {
    const stderrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const phones = [
      {id: 'A', state: 'device', isEmulator: false},
      {id: 'B', state: 'device', isEmulator: false},
    ];
    const result = setupDevice(phones);
    expect(result).toEqual({ok: false, reason: 'multiple_phones', phones});
    stderrSpy.mockRestore();
  });

  it('succeeds for a single phone', () => {
    const phone = {id: 'ABC123', state: 'device', isEmulator: false};
    expect(setupDevice([phone])).toEqual({ok: true, phone});
  });

  it('ignores emulators when a phone is selected', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const phone = {id: 'ABC123', state: 'device', isEmulator: false};
    const emulator = {id: 'emulator-5554', state: 'device', isEmulator: true};
    expect(setupDevice([phone, emulator])).toEqual({ok: true, phone});
    expect(logSpy).toHaveBeenCalledWith('Ignoring emulator(s): emulator-5554');
    logSpy.mockRestore();
  });
});

describe('printSetupHelp', () => {
  it('prints setup instructions', () => {
    const stderrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    printSetupHelp();
    expect(stderrSpy).toHaveBeenCalled();
    stderrSpy.mockRestore();
  });
});

describe('runAdbReverse', () => {
  it('reverses each dev port for the selected phone', () => {
    const exec = jest.fn().mockReturnValue('');
    runAdbReverse('ABC123', DEV_PORTS, exec);
    expect(exec).toHaveBeenCalledWith(
      'adb -s ABC123 reverse tcp:8080 tcp:8080',
      expect.any(Object),
    );
    expect(exec).toHaveBeenCalledWith(
      'adb -s ABC123 reverse tcp:8081 tcp:8081',
      expect.any(Object),
    );
  });
});

describe('runSetupAndroidDevice', () => {
  it('returns 0 when setup succeeds', () => {
    const exec = jest
      .fn()
      .mockReturnValue(`List of devices attached\nABC123 device\n`);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(runSetupAndroidDevice(exec)).toBe(0);
    logSpy.mockRestore();
  });

  it('returns 1 when no phone is available', () => {
    const exec = jest.fn().mockReturnValue('List of devices attached\n');
    const stderrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(runSetupAndroidDevice(exec)).toBe(1);
    stderrSpy.mockRestore();
  });
});

describe('isDirectRun', () => {
  it('detects direct execution from argv', () => {
    expect(
      isDirectRun(
        ['node', '/repo/scripts/setupAndroidDevice.ts'],
        '/repo/scripts/setupAndroidDevice.ts',
      ),
    ).toBe(true);
    expect(isDirectRun([], '/repo/scripts/setupAndroidDevice.ts')).toBe(false);
  });
});

describe('runSetupAndroidDeviceCli', () => {
  it('exits with setup status', () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const exec = jest
      .fn()
      .mockReturnValue('List of devices attached\nABC123 device\n');
    expect(() => runSetupAndroidDeviceCli(exec)).toThrow('exit');
    exit.mockRestore();
  });
});

describe('maybeRunSetupAndroidDeviceCli', () => {
  it('skips cli when not a direct run', async () => {
    const {maybeRunSetupAndroidDeviceCli} =
      await import('./setupAndroidDevice.ts');
    expect(() => {
      maybeRunSetupAndroidDeviceCli(false);
    }).not.toThrow();
  });

  it('runs cli when direct run is true', async () => {
    const {maybeRunSetupAndroidDeviceCli} =
      await import('./setupAndroidDevice.ts');
    const run = jest.fn();
    maybeRunSetupAndroidDeviceCli(true, run);
    expect(run).toHaveBeenCalled();
  });
});
