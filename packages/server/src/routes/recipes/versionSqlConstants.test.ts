import {
  GET_VERSION_DETAIL_SQL,
  LIST_VERSIONS_SQL,
} from './versionSqlConstants.js';

describe('versionSqlConstants', () => {
  test('includes version detail and list queries', () => {
    expect(GET_VERSION_DETAIL_SQL).toContain('from recipe_versions rv');
    expect(GET_VERSION_DETAIL_SQL).toContain('where rv.id = $1');
    expect(LIST_VERSIONS_SQL).toContain('order by rv.version_number desc');
    expect(LIST_VERSIONS_SQL).toContain('where rv.recipe_id = $1');
  });
});
