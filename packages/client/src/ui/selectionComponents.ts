import type {ReactNode} from 'react';

export type CheckboxSelectItem = {id: string; label: string};

export type CheckboxSelectListProps = {
  items: CheckboxSelectItem[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
};

export type BulkSelectToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  selectedCount: number;
  filteredCount: number;
  disabled?: boolean;
  busy?: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  selectAllLabel?: string;
  clearSelectionLabel?: string;
};

export type ToggleChipOption = {id: string; label: string; color?: string};

export type ToggleChipGroupProps = {
  options: ToggleChipOption[];
  multi?: boolean;
  selectedIds?: ReadonlySet<string>;
  selectedId?: string;
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
};

export type TabBarTab = {key: string; label: string};

export type TabBarProps = {
  tabs: TabBarTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
};

export type ThumbnailListCardProps = {
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  /** Web: react-router destination */
  linkTo?: string;
};
