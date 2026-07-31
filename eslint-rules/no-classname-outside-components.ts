import type {AST, ESLint} from 'eslint';

const normalizePath = (filename: string) => filename.replace(/\\/g, '/');

const isComponentsFile = (filename: string) =>
  /\/packages\/(app|web)\/src\/components\//.test(normalizePath(filename));

const isAppOrWebSource = (filename: string) => {
  const path = normalizePath(filename);
  return path.includes('/packages/app/') || path.includes('/packages/web/');
};

const noClassnameOutsideComponentsPlugin: ESLint.Plugin = {
  rules: {
    'no-classname-outside-components': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow className outside src/components — extract styling to reusable components',
        },
        messages: {
          forbidden:
            'className must only be used inside src/components/. Extract a reusable component instead.',
        },
        schema: [],
      },
      create(context) {
        const filename = context.filename;
        if (
          !isAppOrWebSource(filename) ||
          isComponentsFile(filename) ||
          filename.endsWith('.test.tsx')
        ) {
          return {};
        }

        return {
          JSXAttribute(node: {
            name: {type: string; name?: string};
            loc?: AST.SourceLocation | null;
          }) {
            if (
              node.name.type === 'JSXIdentifier' &&
              node.name.name === 'className' &&
              node.loc
            ) {
              context.report({loc: node.loc, messageId: 'forbidden'});
            }
          },
        };
      },
    },
  },
};

export default noClassnameOutsideComponentsPlugin;
