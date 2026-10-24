/**
 * User Workspace Storage & Multi-User Data Isolation Service
 * 
 * Guarantees that each user has completely isolated, persistent data:
 * - Saved architecture blueprints and projects
 * - Persistent Copilot chat history (both per-project and global co-founder chats)
 * - Cloudinary media asset library (sketches, architecture diagrams, user uploads)
 * - Draft napkin ideas and whiteboard drawings
 * - Custom AI and Cloudinary credentials
 */

const WORKSPACE_PREFIX = 'rb_workspace_';

/**
 * Default empty workspace template for a new user.
 */
function createDefaultWorkspace() {
  return {
    projects: [],
    activeProjectId: '',
    draftIdea: '',
    chatSessions: {
      global: [
        {
          id: 'welcome',
          role: 'assistant',
          content: `👋 **Welcome! I'm your AI Architecture Co-Founder & Technical Copilot.**\n\nYour entire chat history, blueprints, napkin sketches, and media uploads are automatically saved to your private account and Cloudinary CDN vault. What would you like to architect today?`,
          action: null,
          actionApplied: false,
          timestamp: new Date().toISOString(),
        }
      ]
    },
    cloudinaryAssets: [],
    preferences: {
      language: 'en-US',
      ttsEnabled: true,
      autoApplyActions: true,
      theme: 'light',
    },
    aiConfig: null,
    cloudinaryConfig: null,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Retrieves the full workspace for a given user.
 */
export function getUserWorkspace(userId) {
  if (!userId) return createDefaultWorkspace();
  const key = `${WORKSPACE_PREFIX}${userId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      // Ensure defaults for all keys
      return {
        ...createDefaultWorkspace(),
        ...data,
        chatSessions: { ...createDefaultWorkspace().chatSessions, ...(data.chatSessions || {}) },
        cloudinaryAssets: data.cloudinaryAssets || [],
        projects: data.projects || [],
      };
    }
  } catch (e) {
    console.error(`[Storage] Failed to read workspace for ${userId}:`, e);
  }

  // Check if legacy data exists to migrate for the first architect
  const workspace = createDefaultWorkspace();
  migrateLegacyData(userId, workspace);
  saveUserWorkspace(userId, workspace);
  return workspace;
}

/**
 * Saves the full workspace for a given user.
 */
export function saveUserWorkspace(userId, workspace) {
  if (!userId || !workspace) return;
  const key = `${WORKSPACE_PREFIX}${userId}`;
  try {
    const toSave = {
      ...workspace,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(toSave));
  } catch (e) {
    console.error(`[Storage] Failed to save workspace for ${userId}:`, e);
  }
}

/**
 * Migrates any pre-existing localStorage data into the user's workspace.
 */
function migrateLegacyData(userId, workspace) {
  try {
    // 1. Saved projects
    const legacyProjects = localStorage.getItem('rb_saved_projects');
    if (legacyProjects) {
      const parsed = JSON.parse(legacyProjects);
      if (Array.isArray(parsed) && parsed.length > 0) {
        workspace.projects = parsed;
      }
    }

    // 2. Draft idea
    const legacyDraft = localStorage.getItem('rb_draft_idea');
    if (legacyDraft) {
      workspace.draftIdea = legacyDraft;
    }

    // 3. AI config
    const legacyConfig = localStorage.getItem('rb_config');
    if (legacyConfig) {
      workspace.aiConfig = JSON.parse(legacyConfig);
    }

    // 4. Active project
    const legacyActiveId = localStorage.getItem('rb_active_project_id');
    if (legacyActiveId) {
      workspace.activeProjectId = legacyActiveId;
    }
  } catch (e) {
    console.warn('[Storage] Legacy migration non-fatal error:', e);
  }
}

/* ──────────────────── PROJECTS ──────────────────── */

export function getUserProjects(userId) {
  const ws = getUserWorkspace(userId);
  return ws.projects || [];
}

export function saveUserProjects(userId, projects) {
  const ws = getUserWorkspace(userId);
  ws.projects = projects;
  saveUserWorkspace(userId, ws);
  return projects;
}

export function saveOrUpdateProject(userId, project) {
  const ws = getUserWorkspace(userId);
  const existingIdx = ws.projects.findIndex(p => p.id === project.id);
  if (existingIdx >= 0) {
    ws.projects[existingIdx] = { ...ws.projects[existingIdx], ...project, updatedAt: new Date().toISOString() };
  } else {
    ws.projects.unshift({ ...project, createdAt: new Date().toISOString() });
  }
  saveUserWorkspace(userId, ws);
  return ws.projects;
}

export function deleteUserProject(userId, projectId) {
  const ws = getUserWorkspace(userId);
  ws.projects = ws.projects.filter(p => p.id !== projectId);
  if (ws.activeProjectId === projectId) {
    ws.activeProjectId = '';
  }
  // Also clean up project-specific chat session
  if (ws.chatSessions && ws.chatSessions[projectId]) {
    delete ws.chatSessions[projectId];
  }
  saveUserWorkspace(userId, ws);
  return ws.projects;
}

/* ──────────────────── CHAT SESSIONS ──────────────────── */

/**
 * Gets persistent chat messages for a user and project.
 */
export function getUserChat(userId, projectId = 'global') {
  const ws = getUserWorkspace(userId);
  const sessionKey = projectId || 'global';
  return ws.chatSessions?.[sessionKey] || ws.chatSessions?.['global'] || [];
}

/**
 * Saves persistent chat messages for a user and project.
 */
export function saveUserChat(userId, projectId = 'global', messages = []) {
  if (!userId) return;
  const ws = getUserWorkspace(userId);
  const sessionKey = projectId || 'global';
  if (!ws.chatSessions) ws.chatSessions = {};
  ws.chatSessions[sessionKey] = messages.slice(-100); // Keep last 100 messages for fast rendering
  saveUserWorkspace(userId, ws);
}

/* ──────────────────── CLOUDINARY ASSETS ──────────────────── */

export function getUserCloudinaryAssets(userId) {
  const ws = getUserWorkspace(userId);
  return ws.cloudinaryAssets || [];
}

export function addCloudinaryAsset(userId, asset) {
  const ws = getUserWorkspace(userId);
  if (!ws.cloudinaryAssets) ws.cloudinaryAssets = [];
  
  const record = {
    id: asset.public_id || `cld_${Date.now()}`,
    url: asset.secure_url || asset.url,
    secure_url: asset.secure_url || asset.url,
    thumbnail_url: asset.thumbnail_url || asset.secure_url || asset.url,
    public_id: asset.public_id || '',
    format: asset.format || 'png',
    bytes: asset.bytes || 0,
    width: asset.width || 0,
    height: asset.height || 0,
    title: asset.title || asset.original_filename || 'Cloudinary Media Asset',
    type: asset.type || 'upload', // 'sketch' | 'diagram' | 'avatar' | 'upload' | 'chat'
    projectId: asset.projectId || ws.activeProjectId || '',
    createdAt: asset.created_at || new Date().toISOString(),
  };

  // Add to top of list, prevent duplicate public_ids
  ws.cloudinaryAssets = [record, ...ws.cloudinaryAssets.filter(a => a.id !== record.id)];
  saveUserWorkspace(userId, ws);
  return record;
}

export function deleteCloudinaryAsset(userId, assetId) {
  const ws = getUserWorkspace(userId);
  if (!ws.cloudinaryAssets) return [];
  ws.cloudinaryAssets = ws.cloudinaryAssets.filter(a => a.id !== assetId);
  saveUserWorkspace(userId, ws);
  return ws.cloudinaryAssets;
}

/* ──────────────────── DRAFTS & PREFERENCES ──────────────────── */

export function getUserDraft(userId) {
  const ws = getUserWorkspace(userId);
  return ws.draftIdea || '';
}

export function saveUserDraft(userId, draftText) {
  const ws = getUserWorkspace(userId);
  ws.draftIdea = draftText;
  saveUserWorkspace(userId, ws);
}

export function getUserPreferences(userId) {
  const ws = getUserWorkspace(userId);
  return ws.preferences || {};
}

export function saveUserPreferences(userId, prefs) {
  const ws = getUserWorkspace(userId);
  ws.preferences = { ...ws.preferences, ...prefs };
  saveUserWorkspace(userId, ws);
}

/* ──────────────────── BACKUP / EXPORT ──────────────────── */

export function exportUserBackupJson(userId) {
  const ws = getUserWorkspace(userId);
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(ws, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `repoblueprint_backup_${userId}_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
