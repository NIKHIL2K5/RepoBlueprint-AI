import { useState, useEffect } from 'react';
import './AuthModal.css';
import {
  loginUser,
  registerUser,
  updateUserProfile,
  listUsers,
  DEFAULT_AVATARS,
} from '../services/authService';
import { uploadToCloudinary } from '../services/cloudinary';

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  initialMode = 'login', // 'login' | 'signup' | 'profile' | 'switch'
}) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'profile' | 'switch'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Fullstack Architect');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadMsg, setAvatarUploadMsg] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const usersList = listUsers();

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setError('');
  };

  const handleSwitchTab = (newMode) => {
    setMode(newMode);
    setError('');
  };

  // Handle direct custom avatar upload via Cloudinary
  const handleAvatarFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setAvatarUploadMsg('Uploading avatar to Cloudinary...');
    setError('');

    try {
      const res = await uploadToCloudinary({
        file,
        folder: 'repo-blueprint/avatars',
        tags: ['avatar', 'user_profile'],
        userId: currentUser?.id || 'new_user',
      });
      setSelectedAvatar(res.secure_url);
      setAvatarUploadMsg('Uploaded to Cloudinary CDN!');
      setTimeout(() => setAvatarUploadMsg(''), 3000);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      // Fallback: use FileReader dataUrl so user isn't blocked
      const reader = new FileReader();
      reader.onload = (re) => {
        setSelectedAvatar(re.target.result);
        setAvatarUploadMsg('Avatar selected (local preview)');
        setTimeout(() => setAvatarUploadMsg(''), 3000);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const user = await loginUser(username, password);
      onUserChange(user);
      onClose();
      resetForm();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await registerUser({
        username,
        password,
        fullName: fullName || username,
        role: role || 'Lead Architect',
        bio,
        avatarUrl: selectedAvatar,
      });
      onUserChange(user);
      onClose();
      resetForm();
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const updated = updateUserProfile(currentUser.id, {
        fullName: fullName || currentUser.fullName,
        role: role || currentUser.role,
        bio: bio !== undefined ? bio : currentUser.bio,
        avatarUrl: selectedAvatar || currentUser.avatarUrl,
      });
      onUserChange(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    }
  };

  const handleSelectExistingUser = async (u) => {
    try {
      // Set session to this user
      onUserChange(u);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal-card card" onClick={(e) => e.stopPropagation()}>
        {/* Header Tabs */}
        <div className="auth-modal-header">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab-btn ${mode === 'login' ? 'is-active' : ''}`}
              onClick={() => handleSwitchTab('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${mode === 'signup' ? 'is-active' : ''}`}
              onClick={() => handleSwitchTab('signup')}
            >
              Create Account
            </button>
            {currentUser && (
              <button
                type="button"
                className={`auth-tab-btn ${mode === 'profile' ? 'is-active' : ''}`}
                onClick={() => {
                  setFullName(currentUser.fullName || '');
                  setRole(currentUser.role || '');
                  setBio(currentUser.bio || '');
                  setSelectedAvatar(currentUser.avatarUrl || DEFAULT_AVATARS[0]);
                  handleSwitchTab('profile');
                }}
              >
                My Profile
              </button>
            )}
            {usersList.length > 1 && (
              <button
                type="button"
                className={`auth-tab-btn ${mode === 'switch' ? 'is-active' : ''}`}
                onClick={() => handleSwitchTab('switch')}
              >
                Switch User ({usersList.length})
              </button>
            )}
          </div>
          <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <div className="auth-error-banner animate-fade-in">⚠️ {error}</div>}

        {/* ── Mode 1: LOGIN ── */}
        {mode === 'login' && (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <div className="auth-heading-wrap">
              <h2 className="auth-title">Welcome back</h2>
              <p className="auth-subtitle">
                Log in to access your saved architecture blueprints, persistent chats, and Cloudinary media assets.
              </p>
            </div>

            <div className="auth-field">
              <label className="auth-label">Username</label>
              <input
                type="text"
                className="input auth-input"
                placeholder="e.g. architect or satvik"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label className="auth-label">Password</label>
                <button
                  type="button"
                  className="auth-show-pass-btn"
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input auth-input"
                placeholder="Enter password (default: admin123)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In to Workspace →'}
            </button>

            <div className="auth-switch-prompt">
              Don't have an account yet?{' '}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => handleSwitchTab('signup')}
              >
                Sign up free
              </button>
            </div>
          </form>
        )}

        {/* ── Mode 2: SIGN UP ── */}
        {mode === 'signup' && (
          <form className="auth-form" onSubmit={handleSignupSubmit}>
            <div className="auth-heading-wrap">
              <h2 className="auth-title">Create Architect Account</h2>
              <p className="auth-subtitle">
                Each account has dedicated isolated blueprints, private Copilot history, and Cloudinary media storage.
              </p>
            </div>

            <div className="auth-avatar-picker-section">
              <label className="auth-label">Profile Avatar</label>
              <div className="auth-avatar-row">
                <img
                  src={selectedAvatar}
                  alt="Avatar preview"
                  className="auth-avatar-current"
                />
                <div className="auth-avatar-options">
                  <div className="auth-preset-avatars">
                    {DEFAULT_AVATARS.map((av, idx) => (
                      <img
                        key={idx}
                        src={av}
                        alt={`Preset ${idx}`}
                        className={`auth-preset-avatar ${selectedAvatar === av ? 'is-selected' : ''}`}
                        onClick={() => setSelectedAvatar(av)}
                      />
                    ))}
                  </div>
                  <label className="btn btn-ghost btn-sm auth-upload-avatar-btn">
                    ☁️ {isUploadingAvatar ? 'Uploading...' : 'Upload Custom to Cloudinary'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarFileUpload}
                    />
                  </label>
                </div>
              </div>
              {avatarUploadMsg && (
                <div className="auth-upload-success">{avatarUploadMsg}</div>
              )}
            </div>

            <div className="auth-row-2col">
              <div className="auth-field">
                <label className="auth-label">Username *</label>
                <input
                  type="text"
                  className="input auth-input"
                  placeholder="e.g. satvik"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Full Name</label>
                <input
                  type="text"
                  className="input auth-input"
                  placeholder="e.g. Satvik Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Role / Architectural Focus</label>
              <input
                type="text"
                className="input auth-input"
                placeholder="e.g. Full-Stack Lead, AI Systems Architect, Co-Founder"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>

            <div className="auth-row-2col">
              <div className="auth-field">
                <label className="auth-label">Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input auth-input"
                  placeholder="Min 4 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Confirm Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input auth-input"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating account...' : 'Create Architect Account →'}
            </button>

            <div className="auth-switch-prompt">
              Already have an account?{' '}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => handleSwitchTab('login')}
              >
                Sign in
              </button>
            </div>
          </form>
        )}

        {/* ── Mode 3: EDIT PROFILE ── */}
        {mode === 'profile' && currentUser && (
          <form className="auth-form" onSubmit={handleProfileSave}>
            <div className="auth-heading-wrap">
              <h2 className="auth-title">Architect Profile</h2>
              <p className="auth-subtitle">
                Customize your profile details and avatar for generated project metadata and AI interaction.
              </p>
            </div>

            <div className="auth-avatar-picker-section">
              <label className="auth-label">Avatar</label>
              <div className="auth-avatar-row">
                <img
                  src={selectedAvatar || currentUser.avatarUrl}
                  alt="Avatar"
                  className="auth-avatar-current"
                />
                <div className="auth-avatar-options">
                  <div className="auth-preset-avatars">
                    {DEFAULT_AVATARS.map((av, idx) => (
                      <img
                        key={idx}
                        src={av}
                        alt={`Preset ${idx}`}
                        className={`auth-preset-avatar ${selectedAvatar === av ? 'is-selected' : ''}`}
                        onClick={() => setSelectedAvatar(av)}
                      />
                    ))}
                  </div>
                  <label className="btn btn-ghost btn-sm auth-upload-avatar-btn">
                    ☁️ {isUploadingAvatar ? 'Uploading...' : 'Upload Custom to Cloudinary'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarFileUpload}
                    />
                  </label>
                </div>
              </div>
              {avatarUploadMsg && (
                <div className="auth-upload-success">{avatarUploadMsg}</div>
              )}
            </div>

            <div className="auth-row-2col">
              <div className="auth-field">
                <label className="auth-label">Username (Immutable)</label>
                <input
                  type="text"
                  className="input auth-input"
                  value={currentUser.username}
                  disabled
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Full Name</label>
                <input
                  type="text"
                  className="input auth-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Professional Role</label>
              <input
                type="text"
                className="input auth-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Bio / Focus</label>
              <textarea
                className="input auth-input auth-textarea"
                rows="2"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Focused on distributed systems, real-time collaboration, and event-driven architecture."
              />
            </div>

            <div className="auth-actions-row">
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Save Profile Changes
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </form>
        )}

        {/* ── Mode 4: SWITCH USER ── */}
        {mode === 'switch' && (
          <div className="auth-form">
            <div className="auth-heading-wrap">
              <h2 className="auth-title">Switch User Account</h2>
              <p className="auth-subtitle">
                Select an account to load its isolated blueprints, custom Cloudinary assets, and chat history.
              </p>
            </div>

            <div className="auth-users-list">
              {usersList.map((u) => {
                const isActive = currentUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    className={`auth-user-card ${isActive ? 'is-active' : ''}`}
                    onClick={() => handleSelectExistingUser(u)}
                  >
                    <img src={u.avatarUrl} alt={u.fullName} className="auth-user-card-avatar" />
                    <div className="auth-user-card-info">
                      <div className="auth-user-card-name">
                        {u.fullName} {isActive && <span className="auth-active-badge">Active</span>}
                      </div>
                      <div className="auth-user-card-sub">
                        @{u.username} · {u.role}
                      </div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm">
                      {isActive ? 'Current' : 'Select →'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="auth-actions-row" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => handleSwitchTab('signup')}
              >
                + Create Another Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
