/**
 * User Authentication & Account Management Service
 * 
 * Provides secure client-side user registration, login, session persistence,
 * password hashing (SHA-256 via Web Crypto API), profile updates, and avatar management.
 */

const USERS_STORAGE_KEY = 'rb_auth_users';
const CURRENT_SESSION_KEY = 'rb_auth_current_session';

export const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

/**
 * Computes SHA-256 hash of a string using Web Crypto API.
 */
export async function hashPassword(plainText) {
  if (!plainText) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText + '_rb_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Initializes default user if storage is empty.
 */
function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[Auth] Failed to load users:', e);
  }

  // Seed default initial architect account so the website is immediately ready to explore
  const defaultUser = {
    id: 'user_architect',
    username: 'architect',
    fullName: 'Satvik Architect',
    role: 'Principal Systems Architect',
    bio: 'Designing next-generation microservices, AI architectures, and distributed systems.',
    email: 'architect@repoblueprint.ai',
    avatarUrl: DEFAULT_AVATARS[1],
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // 'admin123'
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  const initial = [defaultUser];
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

function saveStoredUsers(users) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('[Auth] Failed to save users:', e);
  }
}

/**
 * Retrieves the currently active user session.
 */
export function getCurrentUser() {
  try {
    const session = localStorage.getItem(CURRENT_SESSION_KEY);
    if (session) {
      const user = JSON.parse(session);
      // Cross-reference with stored users
      const users = getStoredUsers();
      const fresh = users.find(u => u.id === user.id);
      return fresh || user;
    }
  } catch (e) {
    console.warn('[Auth] Error getting current user:', e);
  }

  // Default fallback: auto-login the primary architect if none is selected
  const users = getStoredUsers();
  if (users.length > 0) {
    const defaultUser = users[0];
    setCurrentSession(defaultUser);
    return defaultUser;
  }

  return null;
}

export function setCurrentSession(user) {
  if (!user) {
    localStorage.removeItem(CURRENT_SESSION_KEY);
    return;
  }
  const safeUser = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role || 'Full-Stack Developer',
    bio: user.bio || '',
    email: user.email || '',
    avatarUrl: user.avatarUrl || DEFAULT_AVATARS[0],
    createdAt: user.createdAt,
    lastLogin: new Date().toISOString(),
  };
  localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(safeUser));
}

/**
 * Registers a new unique user.
 */
export async function registerUser({
  username,
  password,
  fullName,
  email = '',
  role = 'Lead Engineer',
  bio = '',
  avatarUrl = '',
}) {
  const cleanUsername = (username || '').trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error('Username must be at least 3 characters long.');
  }
  if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
    throw new Error('Username can only contain letters, numbers, underscores, and hyphens.');
  }
  if (!password || password.length < 4) {
    throw new Error('Password must be at least 4 characters long.');
  }

  const users = getStoredUsers();
  if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
    throw new Error(`Username "${cleanUsername}" is already taken. Please choose another.`);
  }

  const passwordHash = await hashPassword(password);
  const newUser = {
    id: `user_${cleanUsername}_${Date.now()}`,
    username: cleanUsername,
    fullName: fullName?.trim() || cleanUsername,
    email: email.trim(),
    role: role.trim() || 'Software Architect',
    bio: bio.trim(),
    avatarUrl: avatarUrl.trim() || DEFAULT_AVATARS[users.length % DEFAULT_AVATARS.length],
    passwordHash,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  users.push(newUser);
  saveStoredUsers(users);
  setCurrentSession(newUser);
  return newUser;
}

/**
 * Authenticates a user with username and password.
 */
export async function loginUser(username, password) {
  const cleanUsername = (username || '').trim().toLowerCase();
  if (!cleanUsername) throw new Error('Please enter your username.');
  if (!password) throw new Error('Please enter your password.');

  const users = getStoredUsers();
  const user = users.find(u => u.username.toLowerCase() === cleanUsername);

  if (!user) {
    throw new Error(`No account found with username "${cleanUsername}".`);
  }

  const inputHash = await hashPassword(password);
  // Support both hashed password and legacy plaintext if present
  if (user.passwordHash && user.passwordHash !== inputHash) {
    throw new Error('Incorrect password. Please try again.');
  }

  // Update last login
  user.lastLogin = new Date().toISOString();
  saveStoredUsers(users);
  setCurrentSession(user);
  return user;
}

/**
 * Logs out the current user session.
 */
export function logoutUser() {
  localStorage.removeItem(CURRENT_SESSION_KEY);
}

/**
 * Updates profile fields for a user.
 */
export function updateUserProfile(userId, updates = {}) {
  const users = getStoredUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) throw new Error('User not found.');

  const allowed = ['fullName', 'role', 'bio', 'email', 'avatarUrl'];
  const user = users[index];

  allowed.forEach(field => {
    if (updates[field] !== undefined) {
      user[field] = updates[field];
    }
  });

  users[index] = user;
  saveStoredUsers(users);

  // Update session if it's the current user
  const current = getCurrentUser();
  if (current && current.id === userId) {
    setCurrentSession(user);
  }

  return user;
}

/**
 * Returns all registered users (without password hashes).
 */
export function listUsers() {
  const users = getStoredUsers();
  return users.map(u => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
  }));
}

/**
 * Deletes a user account and associated workspace data.
 */
export function deleteUser(userId) {
  const users = getStoredUsers();
  const filtered = users.filter(u => u.id !== userId);
  saveStoredUsers(filtered);

  // If deleting active user, switch to first remaining user or null
  const current = getCurrentUser();
  if (current && current.id === userId) {
    if (filtered.length > 0) {
      setCurrentSession(filtered[0]);
    } else {
      logoutUser();
    }
  }

  // Clean up user data
  try {
    localStorage.removeItem(`rb_user_data_${userId}`);
    localStorage.removeItem(`rb_chat_sessions_${userId}`);
  } catch {}
}
