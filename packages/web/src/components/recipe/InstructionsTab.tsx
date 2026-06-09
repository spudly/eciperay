import type {RecipeDetail} from '@recipoo/types';

type Props = {recipe: RecipeDetail};

export const InstructionsTab = ({recipe}: Props) => (
  <ol className="list-decimal space-y-4 p-4 ps-8">
    {[...recipe.instructions]
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map(step => (
        <li
          key={step.id}
          className="text-base leading-relaxed text-gray-900"
        >
          {step.body}
        </li>
      ))}
  </ol>
);
