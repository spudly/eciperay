import {
  exportNameFromShowcaseId,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {useEffect, useState} from 'react';
import {View} from 'react-native';

import {EmptyMessage} from '../ui/EmptyMessage';

import {ShowcaseDemoFrame} from './ShowcaseDemoFrame';
import {
  showcaseModuleLoaders,
  type ShowcaseModule,
} from './showcaseModuleLoaders';

const ShowcasePlaceholder = ({
  name,
  detail,
}: {
  name: string;
  detail: string;
}) => (
  <EmptyMessage spacing="list">
    {name} preview is not wired up yet. {detail}
  </EmptyMessage>
);

const readDemo = (
  module: ShowcaseModule,
  exportName: string,
): ShowcaseDemoRenderer | undefined => {
  const exported = (
    module as Partial<Record<string, {demo?: ShowcaseDemoRenderer}>>
  )[exportName];
  return exported?.demo;
};

const getModuleLoader = (
  id: string,
): (() => Promise<ShowcaseModule>) | undefined =>
  (
    showcaseModuleLoaders as Partial<
      Record<string, () => Promise<ShowcaseModule>>
    >
  )[id];

export const ShowcaseDemo = ({id}: {id: string}) => {
  const [Demo, setDemo] = useState<ShowcaseDemoRenderer | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDemo(null);
    setMissing(false);

    const load = async () => {
      const loader = getModuleLoader(id);
      if (loader === undefined) {
        if (!cancelled) {
          setMissing(true);
        }
        return;
      }

      const module = await loader();
      const demo = readDemo(module, exportNameFromShowcaseId(id));
      if (!demo) {
        if (!cancelled) {
          setMissing(true);
        }
        return;
      }

      if (!cancelled) {
        setDemo(() => demo);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // The old ui-showcase-demo-frame class was dead (defined nowhere), so
  // the frame wrappers are plain Views with no replacement styling.
  if (missing) {
    return (
      <View>
        <ShowcasePlaceholder
          name={id}
          detail="Add a .demo on the component export inside a DEV guard."
        />
      </View>
    );
  }

  if (!Demo) {
    return <View />;
  }

  return (
    <View>
      <Demo Frame={ShowcaseDemoFrame} />
    </View>
  );
};
