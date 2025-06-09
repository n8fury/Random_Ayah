// DOM Elements
const loadingSpinner = document.getElementById('loadingSpinner');
const quoteContent = document.getElementById('quoteContent');
const arabicText = document.getElementById('arabicText');
const translationText = document.getElementById('translationText');
const sourceInfo = document.getElementById('sourceInfo');
const refreshBtn = document.getElementById('refreshBtn');
const embedUrl = document.getElementById('embedUrl');

// Set embed URL
embedUrl.textContent = window.location.href;

// Function to show loading state
function showLoading() {
  loadingSpinner.style.display = 'block';
  quoteContent.style.display = 'none';
  refreshBtn.disabled = true;
}

// Function to show content
function showContent() {
  loadingSpinner.style.display = 'none';
  quoteContent.style.display = 'block';
  refreshBtn.disabled = false;
}

// Function to fetch new ayah
async function fetchNewAyah() {
  try {
    showLoading();

    const response = await fetch('/api/random-ayah');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || 'Failed to fetch ayah');
    }

    // Update the content
    arabicText.textContent = data.arabic;
    translationText.textContent = data.translation;
    sourceInfo.textContent = `${data.surah.englishName} ${data.surah.number}:${data.ayah.number}`;

    // Add animation class
    quoteContent.style.animation = 'none';
    quoteContent.offsetHeight; // Trigger reflow
    quoteContent.style.animation = 'fadeIn 0.5s ease-in-out';

    showContent();
  } catch (error) {
    console.error('Error fetching ayah:', error);

    // Show error message
    arabicText.textContent = 'خطأ في تحميل الآية';
    translationText.textContent = 'Error loading verse. Please try again.';
    sourceInfo.textContent = 'Error';

    showContent();
  }
}

// Function to copy embed URL
function copyEmbedUrl() {
  navigator.clipboard
    .writeText(window.location.href)
    .then(() => {
      alert('Embed URL copied to clipboard!');
    })
    .catch((err) => {
      console.error('Failed to copy URL:', err);
    });
}

// Add click handler for embed URL
embedUrl.addEventListener('click', copyEmbedUrl);
embedUrl.style.cursor = 'pointer';
embedUrl.title = 'Click to copy embed URL';

// Auto-refresh every 5 minutes (optional)
let autoRefreshInterval;

function startAutoRefresh() {
  autoRefreshInterval = setInterval(() => {
    fetchNewAyah();
  }, 5 * 60 * 1000); // 5 minutes
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
}

// Load initial ayah when page loads
document.addEventListener('DOMContentLoaded', () => {
  fetchNewAyah();

  // Start auto-refresh (optional - uncomment to enable)
  // startAutoRefresh();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Space or R key to refresh
  if (e.code === 'Space' || e.code === 'KeyR') {
    e.preventDefault();
    fetchNewAyah();
  }
});

// Handle visibility change (refresh when tab becomes visible)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Tab became visible, optionally refresh
    // fetchNewAyah();
  }
});
