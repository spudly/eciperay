import {
  isCoverageCollected,
  loadJestCollectCoverageFrom,
  PACKAGE_PATH_PATTERN,
} from './packageCoveragePatterns.ts';

describe('loadJestCollectCoverageFrom', () => {
  it('returns an empty array when collectCoverageFrom is missing', () => {
    expect(loadJestCollectCoverageFrom('client', () => ({}))).toEqual([]);
  });
});

describe('isCoverageCollected', () => {
  it('collects legalUrls from client jest config', () => {
    expect(isCoverageCollected('packages/client/src/legalUrls.ts')).toBe(true);
  });

  it('excludes client index from coverage', () => {
    expect(isCoverageCollected('packages/client/src/index.ts')).toBe(false);
  });

  it('returns false for paths outside packages', () => {
    expect(isCoverageCollected('README.md')).toBe(false);
  });

  it('returns false for declaration files', () => {
    expect(isCoverageCollected('packages/client/src/types.d.ts')).toBe(false);
  });

  it('returns false for unknown packages', () => {
    expect(isCoverageCollected('packages/types/src/index.ts')).toBe(false);
  });

  it('collects web lib files covered by vitest config', () => {
    expect(isCoverageCollected('packages/web/src/lib/auth.ts')).toBe(true);
  });

  it('excludes web main entry from coverage', () => {
    expect(isCoverageCollected('packages/web/src/main.tsx')).toBe(false);
  });

  it('returns false when capture groups are missing', () => {
    const execSpy = jest
      .spyOn(PACKAGE_PATH_PATTERN, 'exec')
      .mockReturnValue({
        0: 'packages/client/src/foo.ts',
        1: undefined,
        2: 'src/foo.ts',
        index: 0,
        input: 'packages/client/src/foo.ts',
        length: 3,
      } as RegExpExecArray);
    expect(isCoverageCollected('packages/client/src/foo.ts')).toBe(false);
    execSpy.mockRestore();
  });

  it('returns false when jest patterns are missing for a package', () => {
    expect(
      isCoverageCollected('packages/client/src/legalUrls.ts', () => new Map()),
    ).toBe(false);
  });
});
