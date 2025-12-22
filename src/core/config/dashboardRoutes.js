/**
 * Centralized Dashboard Routes Configuration
 * This file defines all dashboard routes and their metadata
 */

import dashboardIcon from '../../assets/sidebar_icons/dashboard_icon.png';
import botIcon from '../../assets/sidebar_icons/bot_logo.png';
import docIcon from '../../assets/sidebar_icons/doc_analysis_logo.png';
import reportIcon from '../../assets/sidebar_icons/report_icon.png';
import faqIcon from '../../assets/sidebar_icons/faq_logo.png';
import settingsIcon from '../../assets/sidebar_icons/settings_icon.png';

export const DASHBOARD_ROUTES = {
  HOME: {
    path: '/dashboard',
    label: 'Dashboard',
    icon: dashboardIcon,
    exact: true,
    order: 1,
  },
  BOT_SETUP: {
    path: '/dashboard/bot-setup',
    label: 'Bot Setup',
    icon: botIcon,
    exact: false,
    order: 2,
  },
  CODE_TO_DOC: {
    path: '/dashboard/code-to-doc',
    label: 'Code To Document',
    icon: docIcon,
    exact: false,
    order: 3,
  },
  REPORT: {
    path: '/dashboard/report',
    label: 'Report',
    icon: reportIcon,
    exact: false,
    order: 4,
    onClick: true, // Custom onClick handler
  },
  FAQ: {
    path: '/dashboard/faq',
    label: 'Help and Faq',
    icon: faqIcon,
    exact: false,
    order: 5,
  },
  SETTINGS: {
    path: '/dashboard/settings',
    label: 'Settings',
    icon: settingsIcon,
    exact: false,
    order: 6,
  },
};

/**
 * Get menu items for sidebar in the correct order
 */
export const getSidebarMenuItems = () => {
  const items = Object.values(DASHBOARD_ROUTES)
    .sort((a, b) => a.order - b.order)
    .map((route) => ({
      label: route.label,
      icon: route.icon,
      to: route.onClick ? undefined : route.path,
      exact: route.exact,
      onClick: route.onClick,
    }));

  // Add divider before Report
  const reportIndex = items.findIndex((item) => item.label === 'Report');
  if (reportIndex > -1) {
    items.splice(reportIndex, 0, { divider: true });
  }

  return items;
};

/**
 * Check if a route is active based on current pathname
 */
export const isRouteActive = (route, currentPathname) => {
  if (!route.to) return false;
  
  if (route.exact) {
    return currentPathname === route.to;
  }
  
  return currentPathname.startsWith(route.to);
};

/**
 * Get route by path
 */
export const getRouteByPath = (pathname) => {
  return Object.values(DASHBOARD_ROUTES).find(
    (route) => route.path === pathname || pathname.startsWith(route.path)
  );
};

