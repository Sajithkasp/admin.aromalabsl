/*************************************************************
 * AROMA LAB — Admin Panel: PnL + Settings + Content + Main App
 * File: admin-3.js
 * Domain: admin.aromalabsl.lk
 *************************************************************/

const { useState, useEffect } = React;

// --- HERO BANNER MANAGER (WITH BEAUTIFUL CAROUSEL & MODERN UPLOAD BUTTON) ---
function HeroManager({ showMsg }) {
  const [heroImages, setHeroImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customUrl, setCustomUrl] = useState('');
  const [sliderIndex, setSliderIndex] = useState(0);

  const DEFAULT_HERO = "https://sajithkasp.github.io/aroma-labsl/hero.jpg";

  useEffect(() => { loadHeroImages(); }, []);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const t = setInterval(() => {
      setSliderIndex(prev => (prev + 1) % heroImages.length);
    }, 4500);
    return () => clearInterval(t);
  }, [heroImages.length]);

  async function loadHeroImages() {
    setLoading(true);
    try {
      const { data, error } = await sb
        .from('site_settings')
        .select('hero_images')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data && data.hero_images && data.hero_images.length > 0) {
        setHeroImages(data.hero_images);
      } else {
        setHeroImages([DEFAULT_HERO]);
      }
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
      setHeroImages([DEFAULT_HERO]);
    }
    setLoading(false);
  }

  async function saveHeroImages(newImages) {
    const { error } = await sb.from('site_settings').upsert({
      id: 1,
      hero_images: newImages,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) throw error;
  }

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const newUrl = await uploadImage(file, 'product-images');
      const isOnlyDefault = heroImages.length === 1 && heroImages[0] === DEFAULT_HERO;
      const newImages = isOnlyDefault ? [newUrl] : [...heroImages, newUrl];

      setHeroImages(newImages);
      await saveHeroImages(newImages);
      showMsg('✅ Hero image uploaded and saved!');
    } catch (err) {
      showMsg('❌ Upload error: ' + err.message);
    }
    setUploading(false);
  }

  async function handleAddUrl() {
    if (!customUrl.trim()) return;
    try {
      const url = customUrl.trim();
      const isOnlyDefault = heroImages.length === 1 && heroImages[0] === DEFAULT_HERO;
      const newImages = isOnlyDefault ? [url] : [...heroImages, url];
      
      setHeroImages(newImages);
      await saveHeroImages(newImages);
      setCustomUrl('');
      showMsg('✅ Hero image URL added!');
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  async function handleDelete(index) {
    if (!window.confirm('Delete this Hero image?')) return;
    try {
      let newImages = heroImages.filter((_, i) => i !== index);
      if (newImages.length === 0) newImages = [DEFAULT_HERO];
      setHeroImages(newImages);
      await saveHeroImages(newImages);
      showMsg('🗑️ Hero image deleted');
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  async function handleSetAsFirst(index) {
    if (index === 0) return;
    try {
      const item = heroImages[index];
      const newImages = [item, ...heroImages.filter((_, i) => i !== index)];
      setHeroImages(newImages);
      await saveHeroImages(newImages);
      setSliderIndex(0);
      showMsg('⭐ Set as Primary Hero Image!');
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  async function handleResetDefault() {
    if (!window.confirm('Reset to Default AROMA LAB Hero Banner?')) return;
    try {
      const newImages = [DEFAULT_HERO];
      setHeroImages(newImages);
      await saveHeroImages(newImages);
      setSliderIndex(0);
      showMsg('🔄 Reset to default hero image');
    } catch (e) {
      showMsg('❌ Error: ' + e.message);
    }
  }

  if (loading) return <div className="adm-loading">Loading hero banners...</div>;

  return (
    <div className="adm-hero-wrap">
      <div className="adm-header-action-row">
        <div>
          <h3 className="adm-section-title">🖼️ Hero Banner Manager ({heroImages.length})</h3>
          <p className="adm-hint">
            මේ image එක main website එකේ මුල් පිටුවේ banner එක (Hero section) විදිහට පේනවා. එකකට වඩා දැම්මොත් slider එකක් විදිහට auto rotate වෙනවා.
          </p>
        </div>
      </div>

      {/* LIVE BANNER SIMULATOR */}
      <div className="adm-hero-preview-stage">
        <div className="adm-hero-preview-slide">
          <img
            src={heroImages[sliderIndex] || DEFAULT_HERO}
            alt="Hero Preview"
            onError={(e) => { e.target.src = DEFAULT_HERO; }}
          />
          <div className="adm-hero-overlay">
            <span className="adm-hero-eyebrow">AROMA LAB · SLIDE {sliderIndex + 1} OF {heroImages.length}</span>
            <h2 className="adm-hero-heading">Haute Parfumerie, <span className="adm-hero-gold">Artisanal Sillage.</span></h2>
            <p className="adm-hero-desc">Bespoke fragrance flacons aged to olfactory distinction.</p>
          </div>
          <span className="adm-hero-sim-tag">Live Storefront Carousel View</span>
        </div>

        {heroImages.length > 1 && (
          <div className="adm-hero-dots">
            {heroImages.map((_, i) => (
              <button
                key={i}
                className={'adm-hero-dot ' + (i === sliderIndex ? 'active' : '')}
                onClick={() => setSliderIndex(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODERN UPLOAD & URL CONTROLS */}
      <div className="adm-hero-toolbar">
        <label className="adm-upload-label" style={{ marginBottom: 0 }}>
          {uploading ? '⏳ Uploading...' : '📤 Upload New Hero Image'}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={(e) => handleUpload(e.target.files[0])}
          />
        </label>

        <div className="adm-hero-url-box">
          <input
            type="url"
            placeholder="Or paste image URL (https://...)"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="adm-input"
          />
          <button onClick={handleAddUrl} className="adm-btn adm-btn-secondary">
            ➕ Add URL
          </button>
        </div>

        <button onClick={handleResetDefault} className="adm-btn adm-btn-secondary">
          🔄 Reset Default
        </button>
      </div>

      {/* HERO IMAGES GRID */}
      <div className="adm-hero-grid">
        {heroImages.map((img, i) => (
          <div
            key={i}
            className={'adm-hero-card ' + (i === 0 ? 'adm-hero-card-primary' : '')}
          >
            <div className="adm-hero-card-img-wrap">
              <img
                src={img}
                alt={`Hero ${i + 1}`}
                onError={(e) => { e.target.src = DEFAULT_HERO; }}
              />
              {i === 0 && (
                <span className="adm-primary-tag">
                  ⭐ PRIMARY BANNER
                </span>
              )}
              <span className="adm-hero-slide-badge">#{i + 1}</span>
            </div>

            <div className="adm-hero-card-footer">
              <span className="adm-hero-filename" title={img}>
                {img.substring(img.lastIndexOf('/') + 1) || `Hero Banner ${i + 1}`}
              </span>
              <div className="adm-hero-card-actions">
                {i !== 0 && (
                  <button
                    onClick={() => handleSetAsFirst(i)}
                    className="adm-btn adm-btn-make-1st"
                    title="Set as First / Primary Image"
                  >
                    ⭐ Make 1st
                  </button>
                )}
                <button
                  onClick={() => handleDelete(i)}
                  className="adm-btn adm-btn-delete"
                  title="Delete image"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Render into DOM
const rootEl = document.getElementById('admin-root');
if (rootEl && window.ReactDOM) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<AdminApp />);
                                                         }
