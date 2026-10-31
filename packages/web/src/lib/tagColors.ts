import {tagColorNames, warmHarvestTagColors} from '@spudly/ui';

/**
 * Tag colors cross the design-system boundary as NAMES (@spudly/ui 1.15.0,
 * design-system#207): the DS TagsPage takes `TagColorName` values for its
 * swatches and for every tag it renders, and stored tag data — which holds raw
 * hexes — converts to a name through the DS `tagColorNameForHex` at the host
 * boundary. What the API stores stays a hex: the Warm Harvest token values ARE
 * the legacy palette verbatim, so the hex for a name is
 * `warmHarvestTagColors[name]`, and this list is those stored hexes in the
 * palette's display order (kept for the values the create call sends and for
 * tests that pin the stored palette).
 */
export const TAG_COLOR_OPTIONS = tagColorNames.map(
  name => warmHarvestTagColors[name],
);

/** The DS swatch options for the tags form: the twelve color names. */
export const TAG_COLOR_NAME_OPTIONS = [...tagColorNames];
