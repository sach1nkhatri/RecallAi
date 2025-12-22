const PROJECTS_KEY = 'recall.projects';
const ACTIVE_PROJECT_KEY = 'recall.activeProject';
const GENERATIONS_KEY = 'recall.generations';
const UPLOADS_KEY = 'recall.uploads';

const safeJsonParse = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn('Failed to parse stored data', err);
    return fallback;
  }
};

const withStorage = (fn, fallback) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    return fn();
  } catch (err) {
    console.warn('LocalStorage access failed', err);
    return fallback;
  }
};

export const loadProjects = () =>
  withStorage(() => safeJsonParse(window.localStorage.getItem(PROJECTS_KEY), []), []);

export const saveProjects = (projects) =>
  withStorage(() => window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)), undefined);

export const loadActiveProjectId = () =>
  withStorage(() => window.localStorage.getItem(ACTIVE_PROJECT_KEY), null);

export const saveActiveProjectId = (projectId) =>
  withStorage(() => window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId || ''), undefined);

export const loadGenerations = () =>
  withStorage(() => safeJsonParse(window.localStorage.getItem(GENERATIONS_KEY), []), []);

export const saveGenerations = (generations) =>
  withStorage(
    () => window.localStorage.setItem(GENERATIONS_KEY, JSON.stringify(generations)),
    undefined
  );

export const loadUploads = () =>
  withStorage(() => safeJsonParse(window.localStorage.getItem(UPLOADS_KEY), []), []);

export const saveUploads = (uploads) =>
  withStorage(() => window.localStorage.setItem(UPLOADS_KEY, JSON.stringify(uploads)), undefined);

// TODO: Consider pruning old generations/uploads if storage size becomes an issue.

// TODO: Extend with helpers to prune data if storage size becomes a concern.
