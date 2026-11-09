import React, { createContext, useContext, useState, useEffect } from 'react';
import type { DashboardView, ProjectWorkspaceTab } from '../types/navigation.js';
import { DashboardService } from '../services/dashboard-service.js';
import { MockDashboardTransport } from '../services/mock-transport.js';
import { IpcDashboardTransport } from '../services/ipc-transport.js';
import type { NotificationItem } from '@nimo-deck/shared';

export interface DashboardContextValue {
  activeView: DashboardView;
  setActiveView: (view: DashboardView) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  activeWorkspaceTab: ProjectWorkspaceTab;
  setActiveWorkspaceTab: (tab: ProjectWorkspaceTab) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isNotificationCenterOpen: boolean;
  setNotificationCenterOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  service: DashboardService;
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  isOnboardingOpen: boolean;
  setOnboardingOpen: (open: boolean) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export interface DashboardProviderProps {
  children: React.ReactNode;
  service?: DashboardService;
  initialView?: DashboardView;
  initialProjectId?: string | null;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({
  children,
  service: customService,
  initialView = 'overview',
  initialProjectId = null
}) => {
  const [service] = useState<DashboardService>(() => {
    if (customService) return customService;
    // Prefer IPC if in Electron, otherwise fallback to mock fixtures or HTTP
    const ipc = new IpcDashboardTransport();
    if (ipc.isAvailable()) {
      return new DashboardService(ipc);
    }
    return new DashboardService(new MockDashboardTransport());
  });

  const [activeView, setActiveView] = useState<DashboardView>(initialView);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<ProjectWorkspaceTab>('overview');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [isNotificationCenterOpen, setNotificationCenterOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOnboardingOpen, setOnboardingOpen] = useState<boolean>(false);

  // Sync theme to document element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Load initial notifications
  useEffect(() => {
    service
      .getNotifications()
      .then((items) => setNotifications(items))
      .catch(() => {});
  }, [service]);

  // Global keyboard shortcuts (Ctrl/Cmd + K for palette, Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setNotificationCenterOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);
  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const markNotificationRead = async (id: string) => {
    await service.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardContext.Provider
      value={{
        activeView,
        setActiveView: (view) => {
          setSelectedProjectId(null);
          setActiveView(view);
        },
        selectedProjectId,
        setSelectedProjectId,
        activeWorkspaceTab,
        setActiveWorkspaceTab,
        isSidebarCollapsed,
        toggleSidebar,
        isCommandPaletteOpen,
        setCommandPaletteOpen,
        isNotificationCenterOpen,
        setNotificationCenterOpen,
        searchQuery,
        setSearchQuery,
        theme,
        toggleTheme,
        service,
        notifications,
        unreadNotificationsCount,
        markNotificationRead,
        isOnboardingOpen,
        setOnboardingOpen
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = (): DashboardContextValue => {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return ctx;
};
