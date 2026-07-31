import noClassnameOutsideComponentsPlugin from './no-classname-outside-components.ts';

const runRule = (filename: string, code: string) => {
  const reports: {messageId: string}[] = [];
  const rule =
    noClassnameOutsideComponentsPlugin.rules['no-classname-outside-components'];
  const listeners = rule.create({
    filename,
    report: descriptor => {
      reports.push({messageId: descriptor.messageId});
    },
  });

  const program = {
    type: 'Program',
    body: [],
    sourceType: 'module',
    loc: {start: {line: 1, column: 0}, end: {line: 1, column: 0}},
  } as never;

  listeners.JSXAttribute?.({
    type: 'JSXAttribute',
    name: {type: 'JSXIdentifier', name: 'className'},
    value: null,
    loc: {start: {line: 1, column: 0}, end: {line: 1, column: 20}},
  });

  void program;
  void code;
  return reports;
};

describe('no-classname-outside-components', () => {
  it('allows className inside src/components', () => {
    expect(
      runRule(
        '/repo/packages/web/src/components/ui/PageTitle.tsx',
        '<h1 className="title" />',
      ),
    ).toEqual([]);
  });

  it('allows className in test files', () => {
    expect(
      runRule(
        '/repo/packages/web/src/pages/HomePage.test.tsx',
        '<div className="test" />',
      ),
    ).toEqual([]);
  });

  it('forbids className in pages', () => {
    expect(
      runRule('/repo/packages/web/src/pages/HomePage.tsx', '<div className />'),
    ).toEqual([{messageId: 'forbidden'}]);
  });

  it('forbids className in screens', () => {
    expect(
      runRule(
        '/repo/packages/app/src/screens/HomeScreen.tsx',
        '<View className />',
      ),
    ).toEqual([{messageId: 'forbidden'}]);
  });
});
