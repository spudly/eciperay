import {setPackageJsonVersion, type SyncFs} from './syncPackageVersions.ts';

const makeFs = (files: Record<string, string>): SyncFs => ({
  readFileSync: (path: string) => {
    const value = files[path];
    if (value === undefined) {
      throw new Error(`missing file: ${path}`);
    }
    return value;
  },
  writeFileSync: (path: string, data: string) => {
    files[path] = data;
  },
});

describe('setPackageJsonVersion', () => {
  test('updates version field', () => {
    const files = {
      '/pkg/package.json': JSON.stringify({name: 'demo', version: '0.0.0'}),
    };
    const fs = makeFs(files);
    setPackageJsonVersion('/pkg/package.json', '1.2.3', fs);
    expect(JSON.parse(files['/pkg/package.json'])).toEqual({
      name: 'demo',
      version: '1.2.3',
    });
  });

  test('adds the version field when absent', () => {
    const files = {'/pkg/package.json': JSON.stringify({name: 'demo'})};
    const fs = makeFs(files);
    setPackageJsonVersion('/pkg/package.json', '2.0.0', fs);
    expect(JSON.parse(files['/pkg/package.json'])).toEqual({
      name: 'demo',
      version: '2.0.0',
    });
  });
});
