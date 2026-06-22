import {
  canReadRecipe,
  canWriteRecipe,
  resolvePublicRecipeAccess,
  toRecipeAccessRecord,
} from './recipeAccess.js';
import {hashShareToken} from './shareToken.js';

const ownerId = 'owner-uuid';
const otherId = 'other-uuid';
const shareToken = 'share-token';
const shareTokenHash = hashShareToken(shareToken);

const privateRecipe = {
  ownerUserId: ownerId,
  visibility: 'private' as const,
  shareTokenHash: null,
};

const unlistedRecipe = {
  ownerUserId: ownerId,
  visibility: 'unlisted' as const,
  shareTokenHash,
};

const publicRecipe = {
  ownerUserId: ownerId,
  visibility: 'public' as const,
  shareTokenHash: null,
};

describe('canReadRecipe', () => {
  test('allows owners regardless of visibility', () => {
    expect(canReadRecipe(privateRecipe, {userId: ownerId})).toBe(true);
    expect(canReadRecipe(unlistedRecipe, {userId: ownerId})).toBe(true);
    expect(canReadRecipe(publicRecipe, {userId: ownerId})).toBe(true);
  });

  test('blocks non-owners for private recipes', () => {
    expect(canReadRecipe(privateRecipe, {userId: otherId})).toBe(false);
    expect(canReadRecipe(privateRecipe, {shareToken})).toBe(false);
  });

  test('allows public reads for anyone', () => {
    expect(canReadRecipe(publicRecipe, {userId: otherId})).toBe(true);
    expect(canReadRecipe(publicRecipe, {})).toBe(true);
  });

  test('allows unlisted reads with valid token or grant', () => {
    expect(canReadRecipe(unlistedRecipe, {shareToken})).toBe(true);
    expect(canReadRecipe(unlistedRecipe, {hasShareGrant: true})).toBe(true);
    expect(canReadRecipe(unlistedRecipe, {userId: otherId})).toBe(false);
    expect(canReadRecipe(unlistedRecipe, {})).toBe(false);
    expect(canReadRecipe(unlistedRecipe, {shareToken: 'bad-token'})).toBe(
      false,
    );
  });
});

describe('canWriteRecipe', () => {
  test('allows only the owner to write', () => {
    expect(canWriteRecipe(privateRecipe, ownerId)).toBe(true);
    expect(canWriteRecipe(privateRecipe, otherId)).toBe(false);
    expect(canWriteRecipe(privateRecipe)).toBe(false);
  });
});

describe('toRecipeAccessRecord', () => {
  test('maps database row fields', () => {
    expect(
      toRecipeAccessRecord({
        user_id: ownerId,
        visibility: 'unlisted',
        share_token_hash: shareTokenHash,
      }),
    ).toEqual(unlistedRecipe);
  });
});

describe('resolvePublicRecipeAccess', () => {
  test('returns not_found when recipe is missing or private', () => {
    expect(resolvePublicRecipeAccess(null)).toBe('not_found');
    expect(resolvePublicRecipeAccess(privateRecipe)).toBe('not_found');
  });

  test('returns forbidden for unlisted without valid access', () => {
    expect(resolvePublicRecipeAccess(unlistedRecipe)).toBe('forbidden');
    expect(
      resolvePublicRecipeAccess(unlistedRecipe, {shareToken: 'bad-token'}),
    ).toBe('forbidden');
  });

  test('returns null when public or unlisted access is allowed', () => {
    expect(resolvePublicRecipeAccess(publicRecipe)).toBeNull();
    expect(resolvePublicRecipeAccess(unlistedRecipe, {shareToken})).toBeNull();
    expect(
      resolvePublicRecipeAccess(unlistedRecipe, {hasShareGrant: true}),
    ).toBeNull();
  });
});
