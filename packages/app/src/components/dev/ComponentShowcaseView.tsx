import {
  COMPONENT_SHOWCASE_CATALOG,
  filterShowcaseEntries,
} from '@eciperay/client';
import {useEffect, useMemo, useState} from 'react';
import {Text, View} from 'react-native';

import {InfoBanner} from '../ui/InfoBanner';
import {PageTitle} from '../ui/PageTitle';
import {ScreenScroll} from '../ui/ScreenScroll';
import {SearchField} from '../ui/SearchField';

import {ShowcaseDemo} from './ShowcaseDemo';
import {ShowcasePicker} from './ShowcasePicker';

export const ComponentShowcaseView = () => {
  const [filter, setFilter] = useState('');
  const filteredEntries = useMemo(
    () => filterShowcaseEntries(COMPONENT_SHOWCASE_CATALOG, filter),
    [filter],
  );
  const [selectedId, setSelectedId] = useState(
    COMPONENT_SHOWCASE_CATALOG[0]?.id ?? '',
  );

  useEffect(() => {
    if (filteredEntries.length === 0) {
      return;
    }

    if (!filteredEntries.some(entry => entry.id === selectedId)) {
      setSelectedId(filteredEntries[0]?.id ?? '');
    }
  }, [filteredEntries, selectedId]);

  const selectedEntry =
    filteredEntries.find(entry => entry.id === selectedId) ??
    COMPONENT_SHOWCASE_CATALOG.find(entry => entry.id === selectedId);

  return (
    <ScreenScroll>
      <PageTitle size="auth">Component Showcase</PageTitle>
      <InfoBanner>
        Development only — pick a mirrored component to preview it in isolation.
        Some complex surfaces still show a placeholder until their demo is wired
        up.
      </InfoBanner>

      <SearchField
        value={filter}
        onChange={setFilter}
        placeholder="Filter components"
      />

      {filteredEntries.length > 0 ? (
        <ShowcasePicker
          value={selectedId}
          onChange={setSelectedId}
          entries={filteredEntries}
        />
      ) : (
        <InfoBanner>No components match that filter.</InfoBanner>
      )}

      {selectedEntry ? (
        <View className="mbs-2">
          <PageTitle
            size="section"
            spacing="section"
          >
            {selectedEntry.label}
          </PageTitle>
          <Text className="text-muted mbe-4 text-sm">{selectedEntry.id}</Text>
          <ShowcaseDemo id={selectedId} />
        </View>
      ) : null}
    </ScreenScroll>
  );
};
