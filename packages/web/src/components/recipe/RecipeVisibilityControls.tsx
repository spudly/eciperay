/* eslint-disable max-lines -- sharing controls include consent and link actions */
import {
  buildRecipePermalink,
  invalidateRecipeQueries,
  PRIVACY_POLICY_URL,
  recipeVisibilityDescriptions,
  recipeVisibilityLabels,
  requiresPublishingConsent,
} from '@eciperay/client';
import type {RecipeDetail, RecipeVisibility} from '@eciperay/types';
import {eciperayTheme, tokens} from '@spudly/ui';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import {eciperay} from '../../lib/api.js';

// The radio option group, checkbox field, and buttons this file used
// to take from the design system and the host components/ui wrapper
// library (all gone in @spudly/ui 6.x), re-expressed in-file with
// native form elements styled on DS tokens. The accessible names are
// the option titles / field label alone — descriptions render beside
// the control, outside its label — exactly as the DS controls
// announced them. API and behavior are unchanged.
type RadioOptionGroupProps = {
  name: string;
  value: string;
  disabled?: boolean;
  options: {value: string; title: string; description?: string}[];
  onChange: (value: string) => void;
};

const RadioOptionGroup = ({
  name,
  value,
  disabled = false,
  options,
  onChange,
}: RadioOptionGroupProps) => (
  <div
    role="radiogroup"
    style={{display: 'flex', flexDirection: 'column', gap: tokens.spacing[2]}}
  >
    {options.map(option => {
      const inputId = `${name}-${option.value}`;
      return (
        <div key={option.value}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[2],
            }}
          >
            <input
              type="radio"
              id={inputId}
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => {
                onChange(option.value);
              }}
            />
            <label
              htmlFor={inputId}
              style={{
                fontSize: tokens.typography.fontSize.md,
                fontFamily: tokens.typography.fontFamily.sans,
                fontWeight: tokens.typography.fontWeight.semibold,
                color: tokens.colors.gray.gray10,
              }}
            >
              {option.title}
            </label>
          </div>
          {option.description ? (
            <p
              style={{
                margin: 0,
                marginLeft: tokens.spacing[5],
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.gray.gray6,
              }}
            >
              {option.description}
            </p>
          ) : null}
        </div>
      );
    })}
  </div>
);

type CheckboxFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: ReactNode;
};

const CheckboxField = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
}: CheckboxFieldProps) => {
  const inputId = useId();
  return (
    <div>
      <div
        style={{display: 'flex', alignItems: 'center', gap: tokens.spacing[2]}}
      >
        <input
          type="checkbox"
          id={inputId}
          checked={checked}
          disabled={disabled}
          onChange={event => {
            onChange(event.target.checked);
          }}
        />
        <label
          htmlFor={inputId}
          style={{
            fontSize: tokens.typography.fontSize.md,
            fontFamily: tokens.typography.fontFamily.sans,
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.gray.gray10,
          }}
        >
          {label}
        </label>
      </div>
      {description ? (
        <div
          style={{
            marginLeft: tokens.spacing[5],
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.gray.gray6,
          }}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
};

const primaryButtonStyle: CSSProperties = {
  borderRadius: 12,
  border: 'none',
  paddingTop: 6,
  paddingBottom: 6,
  paddingLeft: 12,
  paddingRight: 12,
  fontSize: tokens.typography.fontSize.sm,
  fontFamily: tokens.typography.fontFamily.sans,
  fontWeight: tokens.typography.fontWeight.semibold,
  backgroundColor: eciperayTheme.semantic.primary,
  color: '#ffffff',
  cursor: 'pointer',
};

const secondaryButtonStyle: CSSProperties = {
  borderRadius: 12,
  border: `1px solid ${tokens.colors.gray.gray3}`,
  paddingTop: 6,
  paddingBottom: 6,
  paddingLeft: 12,
  paddingRight: 12,
  fontSize: tokens.typography.fontSize.sm,
  fontFamily: tokens.typography.fontFamily.sans,
  fontWeight: tokens.typography.fontWeight.semibold,
  backgroundColor: tokens.colors.gray.gray2,
  color: tokens.colors.gray.gray8,
  cursor: 'pointer',
};

type Props = {recipe: RecipeDetail; onActionMessage: (message: string) => void};

const visibilityOptions: RecipeVisibility[] = ['private', 'unlisted', 'public'];

export const RecipeVisibilityControls = ({recipe, onActionMessage}: Props) => {
  const queryClient = useQueryClient();
  const [pendingVisibility, setPendingVisibility] =
    useState<RecipeVisibility | null>(null);
  const [publishingConsent, setPublishingConsent] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [activeVisibility, setActiveVisibility] = useState(recipe.visibility);

  useEffect(() => {
    setActiveVisibility(recipe.visibility);
  }, [recipe.visibility]);

  const invalidate = () =>
    invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);

  const sharingMutation = useMutation({
    mutationFn: (input: {
      visibility: RecipeVisibility;
      publishingConsent?: boolean;
    }) => eciperay.recipes.patchSharing(recipe.id, input),
    onSuccess: result => {
      setActiveVisibility(result.visibility);
      if (result.shareToken) {
        setShareToken(result.shareToken);
      }
      setPendingVisibility(null);
      setPublishingConsent(false);
      void invalidate();
      onActionMessage('Sharing settings updated');
    },
    onError: error => {
      // A rejected sharing change must not stay selected as if it had
      // saved (#418): drop the pending selection so the controls match
      // the server's visibility again, and surface the reason.
      setPendingVisibility(null);
      setPublishingConsent(false);
      onActionMessage(
        `Could not update sharing settings: ${
          error instanceof Error ? error.message : 'Please try again.'
        }`,
      );
    },
  });

  const rotateMutation = useMutation({
    mutationFn: () => eciperay.recipes.rotateShareToken(recipe.id),
    onSuccess: result => {
      if (result.shareToken) {
        setShareToken(result.shareToken);
      }
      void invalidate();
      onActionMessage('Share link rotated');
    },
    onError: error => {
      onActionMessage(
        `Could not rotate the share link: ${
          error instanceof Error ? error.message : 'Please try again.'
        }`,
      );
    },
  });

  const permalink = buildRecipePermalink(window.location.origin, recipe);
  const shareUrl =
    activeVisibility === 'unlisted' && shareToken
      ? buildRecipePermalink(window.location.origin, recipe, shareToken)
      : activeVisibility === 'public'
        ? permalink
        : null;

  const saveDisabled =
    sharingMutation.isPending ||
    (pendingVisibility !== null &&
      requiresPublishingConsent(recipe.visibility, pendingVisibility) &&
      !publishingConsent);

  return (
    <section
      style={{
        marginBottom: tokens.spacing[4],
        borderRadius: 12,
        border: `1px solid ${tokens.colors.gray.gray3}`,
        padding: tokens.spacing[4],
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: tokens.spacing[2],
          fontSize: tokens.typography.fontSize.sm,
          fontWeight: tokens.typography.fontWeight.semibold,
          color: tokens.colors.gray.gray10,
        }}
      >
        Sharing
      </h3>
      <RadioOptionGroup
        name={`visibility-${recipe.id}`}
        value={pendingVisibility ?? recipe.visibility}
        disabled={sharingMutation.isPending}
        options={visibilityOptions.map(option => ({
          value: option,
          title: recipeVisibilityLabels[option],
          description: recipeVisibilityDescriptions[option],
        }))}
        onChange={value => {
          setPendingVisibility(value as RecipeVisibility);
        }}
      />
      {pendingVisibility === 'public' ? (
        <p
          style={{
            margin: 0,
            marginTop: tokens.spacing[3],
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.warning.warning9,
          }}
        >
          This recipe will be discoverable by anyone browsing Eciperay.
        </p>
      ) : null}
      {pendingVisibility &&
      requiresPublishingConsent(recipe.visibility, pendingVisibility) ? (
        <CheckboxField
          checked={publishingConsent}
          onChange={setPublishingConsent}
          label="Publishing consent"
          description={
            <>
              I understand this recipe may be viewed without signing in and I
              agree to the{' '}
              <a
                href={PRIVACY_POLICY_URL}
                style={{
                  color: eciperayTheme.semantic.primary,
                  textDecoration: 'underline',
                }}
                target="_blank"
                rel="noreferrer"
              >
                Privacy Policy
              </a>
              .
            </>
          }
        />
      ) : null}
      {pendingVisibility && pendingVisibility !== recipe.visibility ? (
        <button
          type="button"
          style={{
            ...primaryButtonStyle,
            marginTop: tokens.spacing[3],
            opacity: saveDisabled ? 0.5 : 1,
          }}
          disabled={saveDisabled}
          onClick={() => {
            // The consent gate is enforced here, not only by the
            // button's disabled state: a press must never publish
            // without the consent the UI is asking for.
            if (
              sharingMutation.isPending ||
              (requiresPublishingConsent(
                recipe.visibility,
                pendingVisibility,
              ) &&
                !publishingConsent)
            ) {
              return;
            }
            sharingMutation.mutate({
              visibility: pendingVisibility,
              ...(requiresPublishingConsent(
                recipe.visibility,
                pendingVisibility,
              )
                ? {publishingConsent: true}
                : {}),
            });
          }}
        >
          Save sharing settings
        </button>
      ) : null}
      {activeVisibility === 'unlisted' ? (
        <div style={{marginTop: tokens.spacing[3]}}>
          <button
            type="button"
            style={{
              ...secondaryButtonStyle,
              opacity: rotateMutation.isPending ? 0.5 : 1,
            }}
            disabled={rotateMutation.isPending}
            onClick={() => {
              rotateMutation.mutate();
            }}
          >
            {shareToken ? 'Rotate share link' : 'Generate share link'}
          </button>
          {shareUrl ? (
            <button
              type="button"
              style={{...secondaryButtonStyle, marginLeft: tokens.spacing[2]}}
              onClick={() => {
                void navigator.clipboard.writeText(shareUrl);
                onActionMessage('Share link copied');
              }}
            >
              Copy share link
            </button>
          ) : null}
        </div>
      ) : null}
      {activeVisibility === 'public' ? (
        <div style={{marginTop: tokens.spacing[3]}}>
          <p
            style={{
              margin: 0,
              fontSize: tokens.typography.fontSize.xs,
              color: tokens.colors.gray.gray6,
            }}
          >
            Public permalink
          </p>
          <div
            style={{
              marginTop: tokens.spacing[1],
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[2],
            }}
          >
            <code
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: tokens.typography.fontSize.xs,
                color: tokens.colors.gray.gray8,
              }}
            >
              {permalink}
            </code>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => {
                void navigator.clipboard.writeText(permalink);
                onActionMessage('Permalink copied');
              }}
            >
              Copy
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};
