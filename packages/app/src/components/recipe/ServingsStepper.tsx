import {useState} from 'react';

import {NumberStepper} from '../ui/NumberStepper';

type Props = {servings: number; onChange: (n: number) => void};

export const ServingsStepper = ({servings, onChange}: Props) => (
  <NumberStepper
    label="Servings"
    value={servings}
    onChange={onChange}
  />
);

if (__DEV__) {
  const ServingsStepperDemo = () => {
    const [servings, setServings] = useState(4);

    return (
      <ServingsStepper
        servings={servings}
        onChange={setServings}
      />
    );
  };

  ServingsStepper.demo = () => <ServingsStepperDemo />;
}
