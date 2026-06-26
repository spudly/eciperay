import {StyleSheet} from 'react-native';

const RECIPE_IMAGE_PREVIEW_HEIGHT = 256;

export const recipeImagePreviewStyles = StyleSheet.create({
  frame: {height: RECIPE_IMAGE_PREVIEW_HEIGHT, width: '100%'},
  image: {width: '100%', height: '100%'},
  placeholder: {height: RECIPE_IMAGE_PREVIEW_HEIGHT, justifyContent: 'center'},
});
