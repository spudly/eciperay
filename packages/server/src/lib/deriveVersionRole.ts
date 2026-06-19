import type {DerivedVersionRole} from '@eciperay/types';

type VersionRef = {id: string; versionNumber: number};

export const deriveVersionRole = (
  version: VersionRef,
  activeVersion: VersionRef,
  cookLogCount: number,
): DerivedVersionRole => {
  if (version.id === activeVersion.id) {
    return 'active';
  }
  if (version.versionNumber < activeVersion.versionNumber) {
    return 'archived';
  }
  if (cookLogCount === 0) {
    return 'draft';
  }
  return 'candidate';
};
