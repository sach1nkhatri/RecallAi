import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadActiveProjectId,
  loadProjects,
  saveActiveProjectId,
  saveProjects,
} from './projectStorage';

const makeProject = (name) => ({
  id:
    (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `proj-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: name?.trim() || 'My First Project',
  createdAt: new Date().toISOString(),
});

const ensureBaselineProjects = () => {
  const storedProjects = loadProjects();
  if (storedProjects.length > 0) {
    return storedProjects;
  }
  const initial = [makeProject('My First Project')];
  saveProjects(initial);
  saveActiveProjectId(initial[0].id);
  return initial;
};

const resolveActiveId = (projects) => {
  const storedActive = loadActiveProjectId();
  if (storedActive && projects.some((p) => p.id === storedActive)) {
    return storedActive;
  }
  const fallback = projects[0]?.id || null;
  if (fallback) {
    saveActiveProjectId(fallback);
  }
  return fallback;
};

const useProjects = () => {
  const [projects, setProjects] = useState(() => ensureBaselineProjects());
  const [activeProjectId, setActiveProjectId] = useState(() => resolveActiveId(ensureBaselineProjects()));

  useEffect(() => {
    // Guard against missing active ID if storage was cleared.
    if (!activeProjectId && projects.length > 0) {
      const fallbackId = projects[0].id;
      setActiveProjectId(fallbackId);
      saveActiveProjectId(fallbackId);
    }
  }, [activeProjectId, projects]);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    if (activeProjectId) {
      saveActiveProjectId(activeProjectId);
    }
  }, [activeProjectId]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const createProject = useCallback((name) => {
    const project = makeProject(name);
    setProjects((prev) => {
      const next = [...prev, project];
      saveProjects(next);
      return next;
    });
    setActiveProjectId(project.id);
    saveActiveProjectId(project.id);
    return project;
  }, []);

  const selectProject = useCallback(
    (projectId) => {
      if (!projectId) return;
      const exists = projects.some((p) => p.id === projectId);
      if (!exists) return;
      setActiveProjectId(projectId);
      saveActiveProjectId(projectId);
    },
    [projects]
  );

  return {
    projects,
    activeProject,
    activeProjectId,
    createProject,
    selectProject,
  };
};

export default useProjects;

