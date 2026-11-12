import {
  buildListPublicRecipesSql,
  GET_PUBLIC_RECIPE_DETAIL_SQL,
} from './sqlConstants.js';

// The author name on public payloads is gated in SQL by the owner's
// show_author_on_public_recipes setting (#411): the CASE must wrap the
// display name in both public queries, so a hidden name never reaches
// the mapper at all.
describe('public recipe author gating in SQL', () => {
  test('detail query gates the author name on the owner setting', () => {
    expect(GET_PUBLIC_RECIPE_DETAIL_SQL).toContain(
      'case when u.show_author_on_public_recipes',
    );
    expect(GET_PUBLIC_RECIPE_DETAIL_SQL).toContain(
      'then u.display_name else null end as author_display_name',
    );
    expect(GET_PUBLIC_RECIPE_DETAIL_SQL).toContain(
      'join users u on u.id = r.user_id',
    );
  });

  test('discovery list query gates the author name on the owner setting', () => {
    const sql = buildListPublicRecipesSql('newest', 'desc');
    expect(sql).toContain('case when u.show_author_on_public_recipes');
    expect(sql).toContain(
      'then u.display_name else null end as author_display_name',
    );
  });
});
