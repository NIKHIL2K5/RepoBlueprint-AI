import { useState, useEffect } from 'react';
import './CloudinaryModal.css';
import {
  getCloudinaryConfig,
  saveCloudinaryConfig,
  testCloudinaryConnection,
  uploadToCloudinary,
} from '../services/cloudinary';
import {
  getUserCloudinaryAssets,
  addCloudinaryAsset,
  deleteCloudinaryAsset,
} from '../services/storageService';

export default function CloudinaryModal({
  isOpen,
  onClose,
  currentUser,
  activeProjectId = '',
}) {
  const [activeTab, setActiveTab] = useState('assets'); // 'assets' | 'settings'
  const [cloudName, setCloudName] = useState('');
  const [uploadPreset, setUploadPreset] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [folder, setFolder] = useState('repo-blueprint');

  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'success' | 'error'
  const [testMessage, setTestMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'sketch' | 'diagram' | 'upload' | 'avatar'

  const [assets, setAssets] = useState([]);

  // Load config & assets on open
  useEffect(() => {
    if (isOpen) {
      const cfg = getCloudinaryConfig(currentUser?.id);
      setCloudName(cfg.cloudName || 'bgumuh2m');
      setUploadPreset(cfg.uploadPreset || 'repo_blueprint');
      setApiKey(cfg.apiKey || '749746485129813');
      setFolder(cfg.folder || 'repo-blueprint');
      setTestStatus(null);
      setTestMessage('');

      if (currentUser?.id) {
        setAssets(getUserCloudinaryAssets(currentUser.id));
      }
    }
  }, [isOpen, currentUser]);

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

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const updated = saveCloudinaryConfig(currentUser?.id, {
      cloudName: cloudName.trim(),
      uploadPreset: uploadPreset.trim(),
      apiKey: apiKey.trim(),
      folder: folder.trim(),
    });
    setTestStatus('success');
    setTestMessage('Cloudinary configuration saved successfully!');
    setTimeout(() => setTestMessage(''), 3000);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Pinging Cloudinary direct upload endpoint...');
    try {
      const result = await testCloudinaryConnection(cloudName, uploadPreset);
      setTestStatus('success');
      setTestMessage(`Connection verified! Cloud Name "${result.cloudName}" is reachable.`);
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err.message || 'Verification failed. Please check your Cloud Name and unsigned Preset.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const res = await uploadToCloudinary({
        file,
        fileName: file.name,
        folder,
        tags: ['repoblueprint', 'gallery_upload'],
        userId: currentUser?.id,
        context: { projectId: activeProjectId },
        onProgress: (p) => setUploadProgress(p),
      });

      const newAsset = addCloudinaryAsset(currentUser?.id, {
        ...res,
        title: file.name,
        type: 'upload',
        projectId: activeProjectId,
      });

      setAssets((prev) => [newAsset, ...prev]);
      setActiveTab('assets');
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteAsset = (id) => {
    if (!confirm('Remove this asset from your Cloudinary vault?')) return;
    const remaining = deleteCloudinaryAsset(currentUser?.id, id);
    setAssets(remaining);
  };

  const handleCopyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAssets = assets.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  return (
    <div className="cld-modal-backdrop" onClick={onClose}>
      <div className="cld-modal-card card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="cld-modal-header">
          <div className="cld-brand-row">
            <div className="cld-brand-icon">☁️</div>
            <div>
              <h2 className="cld-brand-title">Cloudinary Asset Vault</h2>
              <span className="cld-brand-sub">
                Cloud: <strong>{cloudName || 'bgumuh2m'}</strong> · Preset: <strong>{uploadPreset || 'repo_blueprint'}</strong>
              </span>
            </div>
          </div>

          <div className="cld-header-right">
            <div className="cld-tabs">
              <button
                type="button"
                className={`cld-tab-btn ${activeTab === 'assets' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('assets')}
              >
                Media Vault ({assets.length})
              </button>
              <button
                type="button"
                className={`cld-tab-btn ${activeTab === 'settings' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                ⚙️ Cloudinary Settings
              </button>
            </div>
            <button type="button" className="cld-close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* ── TAB 1: ASSETS VAULT ── */}
        {activeTab === 'assets' && (
          <div className="cld-assets-body">
            {/* Top Toolbar */}
            <div className="cld-toolbar">
              <div className="cld-filters">
                {['all', 'sketch', 'diagram', 'upload', 'avatar'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`cld-filter-pill ${filterType === t ? 'is-active' : ''}`}
                    onClick={() => setFilterType(t)}
                  >
                    {t === 'all' && 'All Media'}
                    {t === 'sketch' && '🎨 Napkin Sketches'}
                    {t === 'diagram' && '🗺️ Architecture Diagrams'}
                    {t === 'upload' && '📸 Vision Uploads'}
                    {t === 'avatar' && '👤 Avatars'}
                  </button>
                ))}
              </div>

              <label className="btn btn-primary btn-sm cld-upload-btn">
                <span>{isUploading ? `Uploading ${uploadProgress}%...` : '+ Upload to Cloudinary'}</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>

            {/* Assets Grid */}
            <div className="cld-assets-grid">
              {filteredAssets.map((asset) => (
                <div key={asset.id} className="cld-asset-card">
                  <div className="cld-asset-preview-wrap">
                    <img
                      src={asset.thumbnail_url || asset.secure_url}
                      alt={asset.title}
                      className="cld-asset-thumb"
                      loading="lazy"
                    />
                    <span className="cld-asset-type-badge">{asset.type}</span>
                  </div>

                  <div className="cld-asset-meta">
                    <div className="cld-asset-title" title={asset.title}>
                      {asset.title}
                    </div>
                    <div className="cld-asset-details">
                      <span>{asset.format?.toUpperCase()}</span>
                      {asset.width && asset.height && (
                        <span>· {asset.width}×{asset.height}</span>
                      )}
                      {asset.bytes > 0 && (
                        <span>· {Math.round(asset.bytes / 1024)} KB</span>
                      )}
                    </div>
                  </div>

                  <div className="cld-asset-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs cld-action-btn"
                      onClick={() => handleCopyUrl(asset.secure_url, asset.id)}
                      title="Copy Cloudinary CDN Link"
                    >
                      {copiedId === asset.id ? '✓ Copied!' : '🔗 Copy CDN'}
                    </button>
                    <a
                      href={asset.secure_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-xs cld-action-btn"
                      title="Open full resolution in new tab"
                    >
                      ↗ View
                    </a>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs cld-action-btn cld-delete-btn"
                      onClick={() => handleDeleteAsset(asset.id)}
                      title="Delete from vault"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}

              {filteredAssets.length === 0 && (
                <div className="cld-empty-state">
                  <div className="cld-empty-icon">☁️</div>
                  <h3 className="cld-empty-title">No Cloudinary assets found</h3>
                  <p className="cld-empty-desc">
                    Sketches drawn in the Whiteboard, architecture diagrams, and images uploaded in the input stage will automatically sync to your private Cloudinary vault.
                  </p>
                  <label className="btn btn-primary cld-empty-upload">
                    <span>Upload your first image to Cloudinary</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: SETTINGS ── */}
        {activeTab === 'settings' && (
          <form className="cld-settings-body" onSubmit={handleSaveSettings}>
            <div className="cld-settings-intro">
              <h3 className="cld-section-title">Cloudinary Credentials & CDN Setup</h3>
              <p className="cld-section-desc">
                Connect your free Cloudinary account for lightning-fast image CDN hosting, automatic responsive WebP/AVIF transformations, and permanent diagram storage.
              </p>
            </div>

            {testMessage && (
              <div
                className={`cld-status-alert ${testStatus === 'success' ? 'is-success' : testStatus === 'error' ? 'is-error' : 'is-info'}`}
              >
                {testStatus === 'success' ? '✅' : testStatus === 'error' ? '❌' : '⏳'} {testMessage}
              </div>
            )}

            <div className="cld-form-grid">
              <div className="cld-field">
                <label className="cld-label">
                  Cloud Name *
                  <span className="cld-hint">From Cloudinary Dashboard (e.g. "my-cloud-2026")</span>
                </label>
                <input
                  type="text"
                  className="input cld-input"
                  placeholder="e.g. demo"
                  value={cloudName}
                  onChange={(e) => setCloudName(e.target.value)}
                  required
                />
              </div>

              <div className="cld-field">
                <label className="cld-label">
                  Unsigned Upload Preset *
                  <span className="cld-hint">Created in Settings → Upload → Upload Presets</span>
                </label>
                <input
                  type="text"
                  className="input cld-input"
                  placeholder="e.g. repo_blueprint or docs_upload_preset"
                  value={uploadPreset}
                  onChange={(e) => setUploadPreset(e.target.value)}
                  required
                />
              </div>

              <div className="cld-field">
                <label className="cld-label">
                  Target Folder
                  <span className="cld-hint">Organizes assets in Cloudinary Media Library</span>
                </label>
                <input
                  type="text"
                  className="input cld-input"
                  placeholder="repo-blueprint"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                />
              </div>

              <div className="cld-field">
                <label className="cld-label">
                  API Key (Optional)
                  <span className="cld-hint">Only needed for server-side operations</span>
                </label>
                <input
                  type="text"
                  className="input cld-input"
                  placeholder="Optional API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            </div>

            {/* Quick 3-Step Setup Guide */}
            <div className="cld-guide-box">
              <h4 className="cld-guide-title">💡 How to get your free Cloudinary credentials in 2 minutes:</h4>
              <ol className="cld-guide-steps">
                <li>
                  Sign up or log in at <a href="https://cloudinary.com" target="_blank" rel="noreferrer">cloudinary.com</a> (100% free tier, generous storage & bandwidth).
                </li>
                <li>
                  Find your <strong>Cloud Name</strong> at the top of your Dashboard.
                </li>
                <li>
                  Go to <strong>Settings (⚙️ Gear Icon) → Upload tab → Add upload preset</strong>. Change <strong>Signing Mode</strong> from Signed to <strong>Unsigned</strong>, name it (e.g. <code>repo_blueprint</code>), and click <strong>Save</strong>.
                </li>
                <li>
                  Paste your Cloud Name and Preset name above, then click <strong>⚡ Test Connection</strong>!
                </li>
              </ol>
            </div>

            <div className="cld-settings-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
              >
                ⚡ Test Connection
              </button>
              <button type="submit" className="btn btn-primary">
                Save Cloudinary Settings
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
