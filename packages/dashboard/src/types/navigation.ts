export type DashboardView =
  | 'overview'
  | 'projects'
  | 'explorer'
  | 'timeline'
  | 'github'
  | 'drive'
  | 'intelligence'
  | 'roadmaps'
  | 'history'
  | 'vault'
  | 'settings';

export type ProjectWorkspaceTab =
  | 'overview'
  | 'repository'
  | 'activity'
  | 'intelligence'
  | 'roadmap'
  | 'documentation'
  | 'history'
  | 'snapshots'
  | 'settings';

export interface BreadcrumbItem {
  label: string;
  view?: DashboardView;
  projectId?: string;
}
