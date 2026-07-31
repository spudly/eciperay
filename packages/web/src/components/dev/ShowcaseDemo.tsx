import {
  exportNameFromShowcaseId,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {useEffect, useState} from 'react';

import {EmptyMessage} from '../ui/EmptyMessage.js';

import {ShowcaseDemoFrame} from './ShowcaseDemoFrame.js';
import {
  showcaseModuleLoaders,
  type ShowcaseModule,
} from './showcaseModuleLoaders.js';

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

  if (missing) {
    return (
      <div className="ui-showcase-demo-frame">
        <ShowcasePlaceholder
          name={id}
          detail="Add a .demo on the component export inside a DEV guard."
        />
      </div>
    );
  }

  if (!Demo) {
    return <div className="ui-showcase-demo-frame" />;
  }

  return (
    <div className="ui-showcase-demo-frame">
      <Demo Frame={ShowcaseDemoFrame} />
    </div>
  );
};
