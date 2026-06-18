import coverageIgnorePlugin from './coverage-ignore-require-description.ts';

const runRuleOnComments = (
  comments: {value: string; loc?: {start: {line: number}}}[],
) => {
  const reports: {messageId: string}[] = [];
  const rule = coverageIgnorePlugin.rules['require-description'];
  const listeners = rule.create({
    report: descriptor => {
      reports.push({messageId: descriptor.messageId});
    },
  });
  listeners.Program({
    comments: comments.map(comment => {
      if (comment.loc) {
        return comment;
      }
      return {value: comment.value};
    }),
  });
  return reports;
};

describe('coverage-ignore require-description', () => {
  it('allows coverage ignores with a description', () => {
    expect(
      runRuleOnComments([
        {value: ' istanbul ignore next -- uncovered branch '},
        {value: ' c8 ignore next -- generated '},
      ]),
    ).toEqual([]);
  });

  it('ignores unrelated comments', () => {
    expect(runRuleOnComments([{value: ' regular comment '}])).toEqual([]);
  });

  it('requires a description on istanbul and c8 ignore comments', () => {
    expect(
      runRuleOnComments([
        {value: ' istanbul ignore next ', loc: {start: {line: 1}}},
        {value: ' c8 ignore start ', loc: {start: {line: 2}}},
      ]),
    ).toEqual([{messageId: 'missing'}, {messageId: 'missing'}]);
  });

  it('skips comments without a source location', () => {
    expect(runRuleOnComments([{value: ' istanbul ignore next '}])).toEqual([]);
  });
});
