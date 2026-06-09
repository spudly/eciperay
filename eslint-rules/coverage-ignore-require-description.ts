import type {AST, ESLint} from 'eslint';

const coverageIgnorePlugin: ESLint.Plugin = {
  rules: {
    'require-description': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Require a `-- reason` on istanbul and c8 coverage-ignore comments',
        },
        messages: {
          missing:
            'Coverage ignore comment must include a description after `--`',
        },
        schema: [],
      },
      create(context) {
        return {
          Program(node: AST.Program) {
            for (const comment of node.comments) {
              const value = comment.value.trim();
              if (
                /^(?:istanbul|c8)\s+ignore\b/.test(value) &&
                !value.includes('--') &&
                comment.loc
              ) {
                context.report({loc: comment.loc, messageId: 'missing'});
              }
            }
          },
        };
      },
    },
  },
};

export default coverageIgnorePlugin;
