import {useState} from 'react';

import {NumberStepper} from '../ui/NumberStepper.js';

type Props = {servings: number; onChange: (n: number) => void};

export const ServingsStepper = ({servings, onChange}: Props) => (
  <NumberStepper
    label="Servings"
    value={servings}
    onChange={onChange}
  />
);

if (import.meta.env.DEV) {
  ServingsStepper.demo = function ServingsStepperDemo() {
    const [servings, setServings] = useState(4);

    return (
      <ServingsStepper
        servings={servings}
        onChange={setServings}
      />
    );
  };
}
