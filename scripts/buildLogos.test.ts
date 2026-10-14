import {
  applyThemeTokens,
  assertOptimizedSvg,
  buildCombinedSvg,
  buildLogos,
  buildMarkSvg,
  buildVariantSvg,
  buildWordmarkSvg,
  darkOutputPath,
  extractSvgInner,
  formatDim,
  isDirectRun,
  mergeTheme,
  maybeRunBuildLogosCli,
  normalizeColor,
  optimizeSvg,
  runBuildLogosCli,
  selectRasterSvg,
  stripChalkFilter,
  validateSvgColors,
  validateThemeColors,
  type BuildLogosDeps,
  type BuildLogosFs,
  type ThemeColors,
} from './buildLogos.ts';

const defaultTheme: ThemeColors = {
  logoBg: '#0943ce',
  logoInk: '#eef2f6',
  logoSpoonFill: '#eef2f6',
  logoSpoonStroke: 'none',
  wordmarkFill: '#04152d',
  wordmarkAccent: '#0943ce',
};

const darkTheme: ThemeColors = {
  logoBg: '#04152d',
  logoInk: '#eef2f6',
  logoSpoonFill: '#eef2f6',
  logoSpoonStroke: 'none',
  wordmarkFill: '#eef2f6',
  wordmarkAccent: '#0943ce',
};

const masterMark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs><filter id="chalk"><feGaussianBlur/></filter></defs>
  <rect id="bgRounded" fill="{{logoBg}}"/>
  <circle id="bgCircle" fill="{{logoBg}}" style="display:none"/>
  <g id="gridLines" clip-path="url(#roundClip)" filter="url(#chalk)"><path/></g>
  <path id="spoon" fill="{{logoSpoonFill}}" stroke="{{logoSpoonStroke}}" filter="url(#chalk)"/>
</svg>`;

const masterWordmark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 403.051 97">
  <g fill="{{wordmarkFill}}"><path/></g>
  <path id="i-dot" fill="{{wordmarkAccent}}"/>
</svg>`;

const makeFs = (overrides: Partial<BuildLogosFs> = {}): BuildLogosFs => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  copyFileSync: jest.fn(),
  ...overrides,
});

const makeDeps = (overrides: Partial<BuildLogosDeps> = {}): BuildLogosDeps => ({
  optimizeSvg: (svg: string) => svg,
  rasterizePng: jest.fn().mockResolvedValue(Buffer.from('png')),
  ...overrides,
});

describe('darkOutputPath', () => {
  it('inserts -dark before the extension', () => {
    expect(darkOutputPath('logo.svg')).toBe('logo-dark.svg');
    expect(darkOutputPath('logo-minimal.svg')).toBe('logo-minimal-dark.svg');
  });
});

describe('normalizeColor', () => {
  it('normalizes valid hex and none', () => {
    expect(normalizeColor('#0943CE')).toBe('#0943ce');
    expect(normalizeColor('none')).toBe('none');
  });

  it('rejects invalid values', () => {
    expect(() => normalizeColor('red')).toThrow('Invalid color value');
    expect(() => normalizeColor('#abc')).toThrow('Invalid color value');
  });
});

describe('mergeTheme', () => {
  it('returns the base theme when no overrides are provided', () => {
    expect(mergeTheme(defaultTheme)).toBe(defaultTheme);
  });

  it('merges valid overrides onto the base theme', () => {
    expect(
      mergeTheme(defaultTheme, {
        logoSpoonFill: '#eef2f6',
        logoSpoonStroke: 'none',
      }),
    ).toEqual({
      ...defaultTheme,
      logoSpoonFill: '#eef2f6',
      logoSpoonStroke: 'none',
    });
  });

  it('rejects disallowed override colors', () => {
    expect(() => mergeTheme(defaultTheme, {logoSpoonFill: '#ff0000'})).toThrow(
      'disallowed color',
    );
  });
});

describe('validateThemeColors', () => {
  it('accepts brand palette values', () => {
    expect(() => {
      validateThemeColors(defaultTheme, 'default');
    }).not.toThrow();
  });

  it('rejects disallowed colors', () => {
    expect(() => {
      validateThemeColors({...defaultTheme, logoBg: '#ff0000'}, 'bad');
    }).toThrow('disallowed color');
  });
});

describe('validateSvgColors', () => {
  it('accepts brand colors in svg', () => {
    expect(() => {
      validateSvgColors('<path fill="#0943ce" stroke="#eef2f6"/>');
    }).not.toThrow();
  });

  it('accepts svg without hex colors', () => {
    expect(() => {
      validateSvgColors('<path fill="none"/>');
    }).not.toThrow();
  });

  it('rejects non-brand colors', () => {
    expect(() => {
      validateSvgColors('<path fill="#ff0000"/>');
    }).toThrow('disallowed color');
  });
});

describe('applyThemeTokens', () => {
  it('replaces tokens and validates output', () => {
    const result = applyThemeTokens(
      '<rect fill="{{logoBg}}" stroke="{{logoSpoonStroke}}"/>',
      defaultTheme,
    );
    expect(result).toContain('fill="#0943ce"');
    expect(result).toContain('stroke="none"');
  });

  it('throws on unknown tokens', () => {
    expect(() =>
      applyThemeTokens('<rect fill="{{missing}}"/>', defaultTheme),
    ).toThrow('Unknown theme token');
  });
});

describe('buildMarkSvg', () => {
  it('builds rounded mark with grid', () => {
    const svg = buildMarkSvg(
      masterMark,
      {bg: 'rounded', showGrid: true},
      defaultTheme,
    );
    expect(svg).toContain('id="bgRounded"');
    expect(svg).not.toContain('id="bgCircle"');
    expect(svg).toContain('id="gridLines"');
    expect(svg).toContain('fill="#0943ce"');
  });

  it('builds circle mark without grid', () => {
    const svg = buildMarkSvg(
      masterMark,
      {bg: 'circle', showGrid: false},
      darkTheme,
    );
    expect(svg).toContain('id="bgCircle"');
    expect(svg).not.toContain('id="bgRounded"');
    expect(svg).not.toContain('id="gridLines"');
  });

  it('uses circle clip when circle background has grid', () => {
    const svg = buildMarkSvg(
      masterMark,
      {bg: 'circle', showGrid: true},
      darkTheme,
    );
    expect(svg).toContain('url(#circleClip)');
  });

  it('strips the chalk filter for minimal marks', () => {
    const svg = buildMarkSvg(
      masterMark,
      {bg: 'rounded', showGrid: false, chalk: false},
      defaultTheme,
    );
    expect(svg).not.toContain('filter="url(#chalk)"');
    expect(svg).not.toContain('id="chalk"');
  });
});

describe('stripChalkFilter', () => {
  it('removes chalk filter usage and definition', () => {
    const input =
      '<defs><filter id="chalk"><feGaussianBlur/></filter></defs><path filter="url(#chalk)"/>';
    const output = stripChalkFilter(input);
    expect(output).not.toContain('chalk');
    expect(output).toBe('<defs></defs><path/>');
  });
});

describe('buildWordmarkSvg', () => {
  it('applies wordmark theme tokens', () => {
    const svg = buildWordmarkSvg(masterWordmark, defaultTheme);
    expect(svg).toContain('fill="#04152d"');
    expect(svg).toContain('fill="#0943ce"');
  });
});

describe('formatDim', () => {
  it('formats viewBox dimensions without trailing zeros', () => {
    expect(formatDim(369)).toBe('369');
    expect(formatDim(403.051)).toBe('403.051');
    expect(formatDim(73.5255)).toBe('73.525');
  });
});

describe('extractSvgInner', () => {
  it('returns inner svg content', () => {
    expect(extractSvgInner('<svg><g id="a"/></svg>')).toBe('<g id="a"/>');
  });

  it('throws when svg is invalid', () => {
    expect(() => extractSvgInner('not svg')).toThrow('Invalid SVG');
  });
});

describe('buildCombinedSvg', () => {
  it('lays out horizontal lockup', () => {
    const svg = buildCombinedSvg(
      masterMark,
      masterWordmark,
      {layout: 'horizontal', mark: {bg: 'rounded', showGrid: true}, gap: 24},
      defaultTheme,
    );
    expect(svg).toContain('viewBox="0 0 683.051 256"');
    expect(svg).toContain('translate(280');
  });

  it('lays out stacked lockup', () => {
    const svg = buildCombinedSvg(
      masterMark,
      masterWordmark,
      {layout: 'stacked', mark: {bg: 'rounded', showGrid: true}, gap: 16},
      defaultTheme,
    );
    expect(svg).toContain('viewBox="0 0 403.051 369"');
    expect(svg).toContain('translate(73.525 0)');
  });
});

describe('buildVariantSvg', () => {
  it('dispatches by variant type', () => {
    expect(
      buildVariantSvg(
        {output: 'logo.svg', type: 'mark', bg: 'rounded', showGrid: true},
        defaultTheme,
        {mark: masterMark, wordmark: masterWordmark},
      ),
    ).toContain('bgRounded');
    expect(
      buildVariantSvg(
        {output: 'logo-text.svg', type: 'wordmark'},
        defaultTheme,
        {mark: masterMark, wordmark: masterWordmark},
      ),
    ).toContain('fill="#04152d"');
    expect(
      buildVariantSvg(
        {
          output: 'logo-horizontal.svg',
          type: 'combined',
          layout: 'horizontal',
          mark: {bg: 'rounded', showGrid: true},
          gap: 24,
        },
        defaultTheme,
        {mark: masterMark, wordmark: masterWordmark},
      ),
    ).toContain('translate(280');
  });
});

describe('selectRasterSvg', () => {
  it('uses the minimal svg below the raster threshold', () => {
    expect(selectRasterSvg(16, 'default', 'minimal')).toBe('minimal');
    expect(selectRasterSvg(32, 'default', 'minimal')).toBe('minimal');
  });

  it('uses the default svg at or above the raster threshold', () => {
    expect(selectRasterSvg(48, 'default', 'minimal')).toBe('default');
    expect(selectRasterSvg(512, 'default', 'minimal')).toBe('default');
  });
});

describe('optimizeSvg', () => {
  it('optimizes svg with svgo', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    const output = optimizeSvg(input);
    expect(output.length).toBeLessThanOrEqual(input.length);
  });
});

describe('assertOptimizedSvg', () => {
  it('throws when svgo returns no data', () => {
    expect(() => assertOptimizedSvg()).toThrow('SVGO optimization failed');
  });
});

describe('buildLogos', () => {
  const themesYaml = `default:
  logoBg: '#0943ce'
  logoInk: '#eef2f6'
  logoSpoonFill: '#eef2f6'
  logoSpoonStroke: none
  wordmarkFill: '#04152d'
  wordmarkAccent: '#0943ce'
dark:
  logoBg: '#04152d'
  logoInk: '#eef2f6'
  logoSpoonFill: '#eef2f6'
  logoSpoonStroke: none
  wordmarkFill: '#eef2f6'
  wordmarkAccent: '#0943ce'`;

  const variantsYaml = `variants:
  - output: logo.svg
    type: mark
    bg: rounded
    showGrid: true
  - output: logo-minimal.svg
    type: mark
    bg: rounded
    showGrid: false
    chalk: false
  - output: logo-text.svg
    type: wordmark
  - output: logo-horizontal.svg
    type: combined
    layout: horizontal
    mark:
      bg: rounded
      showGrid: true
    gap: 24`;

  it('writes twelve svg outputs, pngs, and web copies', async () => {
    const rasterizePng = jest.fn().mockResolvedValue(Buffer.from('png'));
    const written: string[] = [];
    const fs = makeFs({
      readFileSync: jest.fn((path: string) => {
        if (path.endsWith('themes.yaml')) {
          return themesYaml;
        }
        if (path.endsWith('variants.yaml')) {
          return variantsYaml;
        }
        if (path.endsWith('master/mark.svg')) {
          return masterMark;
        }
        if (path.endsWith('master/wordmark.svg')) {
          return masterWordmark;
        }
        throw new Error(`unexpected read: ${path}`);
      }),
      writeFileSync: jest.fn((_path: string, data: string | Buffer) => {
        written.push(typeof data === 'string' ? data : data.toString());
      }),
    });

    await buildLogos('/repo', fs, makeDeps({rasterizePng}));

    const writeCalls = (fs.writeFileSync as jest.Mock).mock.calls as [
      string,
      string | Buffer,
    ][];
    const svgOutputs = writeCalls
      .filter(([, data]) => typeof data === 'string')
      .map(([path]) => path);
    expect(svgOutputs).toContain(
      '/repo/assets/logos/generated/logo.svg',
    );
    expect(svgOutputs).toContain(
      '/repo/assets/logos/generated/logo-dark.svg',
    );
    expect(svgOutputs).toContain(
      '/repo/assets/logos/generated/logo-horizontal-dark.svg',
    );
    expect(writeCalls.filter(([, data]) => Buffer.isBuffer(data))).toHaveLength(
      7,
    );
    expect(fs.copyFileSync).toHaveBeenCalledTimes(4);

    const rasterCalls = rasterizePng.mock.calls as [string, number][];
    expect(rasterCalls.find(([, size]) => size === 16)?.[0]).not.toContain(
      'id="gridLines"',
    );
    expect(rasterCalls.find(([, size]) => size === 48)?.[0]).toContain(
      'id="gridLines"',
    );
  });

  it('throws when default logo is missing from config', async () => {
    const fs = makeFs({
      readFileSync: jest.fn((path: string) => {
        if (path.endsWith('themes.yaml')) {
          return themesYaml;
        }
        if (path.endsWith('variants.yaml')) {
          return `variants:
  - output: logo-text.svg
    type: wordmark`;
        }
        if (path.endsWith('master/mark.svg')) {
          return masterMark;
        }
        if (path.endsWith('master/wordmark.svg')) {
          return masterWordmark;
        }
        throw new Error(`unexpected read: ${path}`);
      }),
      writeFileSync: jest.fn(),
    });

    await expect(buildLogos('/repo', fs, makeDeps())).rejects.toThrow(
      'Default logo.svg was not generated',
    );
  });

  it('throws when minimal logo is missing from config', async () => {
    const fs = makeFs({
      readFileSync: jest.fn((path: string) => {
        if (path.endsWith('themes.yaml')) {
          return themesYaml;
        }
        if (path.endsWith('variants.yaml')) {
          return `variants:
  - output: logo.svg
    type: mark
    bg: rounded
    showGrid: true`;
        }
        if (path.endsWith('master/mark.svg')) {
          return masterMark;
        }
        if (path.endsWith('master/wordmark.svg')) {
          return masterWordmark;
        }
        throw new Error(`unexpected read: ${path}`);
      }),
      writeFileSync: jest.fn(),
    });

    await expect(buildLogos('/repo', fs, makeDeps())).rejects.toThrow(
      'Default logo-minimal.svg was not generated',
    );
  });
});

describe('isDirectRun', () => {
  it('detects direct execution from argv', () => {
    expect(
      isDirectRun(
        ['node', '/repo/scripts/buildLogos.ts'],
        '/repo/scripts/buildLogos.ts',
      ),
    ).toBe(true);
    expect(isDirectRun(['node'], '/repo/scripts/buildLogos.ts')).toBe(false);
  });
});

describe('runBuildLogosCli', () => {
  it('logs success', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    await expect(runBuildLogosCli()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith('OK: logo assets built');
    log.mockRestore();
  });
});

describe('maybeRunBuildLogosCli', () => {
  it('skips cli when not a direct run', () => {
    const run = jest.fn();
    maybeRunBuildLogosCli(false, run);
    expect(run).not.toHaveBeenCalled();
  });

  it('runs cli when direct run is true', async () => {
    const run = jest.fn().mockResolvedValue();
    maybeRunBuildLogosCli(true, run);
    await Promise.resolve();
    expect(run).toHaveBeenCalled();
  });

  it('exits on cli failure with a non-error rejection', async () => {
    const exit = jest.fn();
    jest.spyOn(process, 'exit').mockImplementation(exit as typeof process.exit);
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const run = jest.fn().mockRejectedValue('boom');
    maybeRunBuildLogosCli(true, run);
    await new Promise<void>(resolve => {
      setImmediate(resolve);
    });
    expect(error).toHaveBeenCalledWith('boom');
    expect(exit).toHaveBeenCalledWith(1);
    jest.restoreAllMocks();
  });

  it('exits on cli failure with an error rejection', async () => {
    const exit = jest.fn();
    jest.spyOn(process, 'exit').mockImplementation(exit as typeof process.exit);
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const run = jest.fn().mockRejectedValue(new Error('boom'));
    maybeRunBuildLogosCli(true, run);
    await new Promise<void>(resolve => {
      setImmediate(resolve);
    });
    expect(error).toHaveBeenCalledWith('boom');
    expect(exit).toHaveBeenCalledWith(1);
    jest.restoreAllMocks();
  });
});
