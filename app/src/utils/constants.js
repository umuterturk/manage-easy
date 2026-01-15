// Status values for Ideas, Features, Tasks, and Bugs
export const STATUS = {
  CREATED: 'CREATED',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
};

// Status display names
export const STATUS_LABELS = {
  [STATUS.CREATED]: 'Created',
  [STATUS.TODO]: 'To Do',
  [STATUS.IN_PROGRESS]: 'In Progress',
  [STATUS.DONE]: 'Done',
};

// Status colors (matching theme)
export const STATUS_COLORS = {
  [STATUS.CREATED]: '#64748B', // Slate gray
  [STATUS.TODO]: '#F59E0B', // Amber (light mode)
  [STATUS.IN_PROGRESS]: '#3B82F6', // Blue (light mode)
  [STATUS.DONE]: '#10B981', // Emerald (light mode)
};

// Status colors for dark mode
export const STATUS_COLORS_DARK = {
  [STATUS.CREATED]: '#64748B', // Slate gray
  [STATUS.TODO]: '#FBBF24', // Brighter amber
  [STATUS.IN_PROGRESS]: '#60A5FA', // Brighter blue
  [STATUS.DONE]: '#34D399', // Brighter emerald
};

// All status options for dropdowns
export const STATUS_OPTIONS = [
  { value: STATUS.CREATED, label: STATUS_LABELS[STATUS.CREATED] },
  { value: STATUS.TODO, label: STATUS_LABELS[STATUS.TODO] },
  { value: STATUS.IN_PROGRESS, label: STATUS_LABELS[STATUS.IN_PROGRESS] },
  { value: STATUS.DONE, label: STATUS_LABELS[STATUS.DONE] },
];
