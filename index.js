require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Add your Unsplash Access Key here
const UNSPLASH_ACCESS_KEY =
  process.env.UNSPLASH_ACCESS_KEY || 'YOUR_UNSPLASH_ACCESS_KEY_HERE';

// Middleware
app.use(cors());
app.use(express.json());

// Curated ayahs by mental state/emotion
const categorizedAyahs = {
  motivation: [
    { surah: 2, ayah: 286 }, // Allah does not burden a soul beyond that it can bear
    { surah: 94, ayah: 5 }, // Indeed, with hardship [will be] ease
    { surah: 94, ayah: 6 }, // Indeed, with hardship [will be] ease
    { surah: 3, ayah: 139 }, // Do not lose hope, nor be sad
    { surah: 8, ayah: 46 }, // And obey Allah and His Messenger, and do not dispute
    { surah: 41, ayah: 30 }, // Those who say: "Our Lord is Allah," and then remain steadfast
    { surah: 39, ayah: 53 }, // Do not despair of the mercy of Allah
    { surah: 65, ayah: 3 }, // And whoever relies upon Allah - then He is sufficient for him
  ],

  calmness: [
    { surah: 13, ayah: 28 }, // hearts find rest in the remembrance of Allah
    { surah: 2, ayah: 62 }, // Those who believe and do righteous deeds
    { surah: 20, ayah: 2 }, // We have not sent down to you the Qur'an that you be distressed
    { surah: 16, ayah: 97 }, // Whoever does righteousness, whether male or female, while he is a believer
    { surah: 25, ayah: 70 }, // Except for those who repent, believe and do righteous work
    { surah: 89, ayah: 27 }, // O reassured soul
    { surah: 89, ayah: 28 }, // Return to your Lord, well-pleased and pleasing [to Him]
  ],

  sadness: [
    { surah: 39, ayah: 53 }, // Do not despair of the mercy of Allah
    { surah: 2, ayah: 214 }, // Or do you think that you will enter Paradise
    { surah: 12, ayah: 87 }, // Do not despair of relief from Allah
    { surah: 94, ayah: 5 }, // Indeed, with hardship [will be] ease
    { surah: 3, ayah: 139 }, // Do not lose hope, nor be sad
    { surah: 21, ayah: 83 }, // Indeed, adversity has touched me
    { surah: 12, ayah: 86 }, // I only complain of my suffering and my grief to Allah
  ],

  anxiety: [
    { surah: 65, ayah: 3 }, // And whoever relies upon Allah - then He is sufficient for him
    { surah: 8, ayah: 2 }, // The believers are only those who, when Allah is mentioned, their hearts become fearful
    { surah: 13, ayah: 28 }, // hearts find rest in the remembrance of Allah
    { surah: 2, ayah: 286 }, // Allah does not burden a soul beyond that it can bear
    { surah: 3, ayah: 173 }, // Sufficient for us is Allah, and [He is] the best Disposer of affairs
    { surah: 9, ayah: 51 }, // Nothing will happen to us except what Allah has decreed for us
  ],

  gratitude: [
    { surah: 14, ayah: 7 }, // If you are grateful, I will certainly give you more
    { surah: 2, ayah: 152 }, // So remember Me; I will remember you
    { surah: 16, ayah: 18 }, // And if you should count the favors of Allah, you could not enumerate them
    { surah: 27, ayah: 40 }, // This is from the favor of my Lord to test me whether I will be grateful
    { surah: 31, ayah: 12 }, // And whoever is grateful - he is grateful for [the benefit of] himself
  ],

  patience: [
    { surah: 2, ayah: 45 }, // And seek help through patience and prayer
    { surah: 2, ayah: 153 }, // Give good tidings to the patient
    { surah: 3, ayah: 200 }, // O you who believe! Persevere in patience and constancy
    { surah: 11, ayah: 115 }, // And be patient, for indeed, Allah does not allow to be lost the reward of those who do good
    { surah: 76, ayah: 12 }, // And will reward them for what they patiently endured [with] a garden and silk
  ],

  hope: [
    { surah: 39, ayah: 53 }, // Do not despair of the mercy of Allah
    { surah: 12, ayah: 87 }, // Do not despair of relief from Allah
    { surah: 65, ayah: 4 }, // And whoever fears Allah - He will make for him a way out
    { surah: 94, ayah: 5 }, // Indeed, with hardship [will be] ease
    { surah: 2, ayah: 216 }, // But perhaps you hate a thing and it is good for you
  ],

  forgiveness: [
    { surah: 39, ayah: 53 }, // Indeed, Allah forgives all sins
    { surah: 25, ayah: 70 }, // Except for those who repent, believe and do righteous work
    { surah: 4, ayah: 110 }, // And whoever does a wrong or wrongs himself but then seeks forgiveness of Allah will find Allah Forgiving and Merciful
    { surah: 42, ayah: 25 }, // And it is He who accepts repentance from his servants and pardons misdeeds
  ],
};

// Store current ayah in memory
let currentAyah = null;
let lastUpdateTime = null;
let currentBackgroundImage = null;

// Function to get random ayah from category
function getRandomAyahFromCategory(category) {
  const ayahs = categorizedAyahs[category];
  if (!ayahs || ayahs.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * ayahs.length);
  return ayahs[randomIndex];
}

// Function to get all available categories
function getAvailableCategories() {
  return Object.keys(categorizedAyahs);
}

// Function to fetch random background image from Unsplash API
async function fetchRandomBackgroundImage() {
  if (
    !UNSPLASH_ACCESS_KEY ||
    UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY_HERE'
  ) {
    console.warn(
      '⚠️ Unsplash API key not configured. Using fallback gradient.'
    );
    return null; // Will use CSS gradient fallback
  }

  try {
    // Curated search terms for high-quality nature scenes without humans
    const searchTerms = [
      'sea sunset horizon',
      'ocean sunrise golden hour',
      'sky sunset clouds',
      'sunrise mountain peaks',
      'snow covered mountains',
      'snowy mountain landscape',
      'ocean waves sunset',
      'sea horizon sunrise',
      'mountain sunrise snow',
      'sky clouds sunset dramatic',
      'snow mountain peaks blue sky',
      'ocean sunset reflection',
    ];

    const randomTerm =
      searchTerms[Math.floor(Math.random() * searchTerms.length)];

    // Enhanced API call with specific parameters for high-quality nature images
    const response = await fetch(
      `https://api.unsplash.com/photos/random?` +
        `query=${encodeURIComponent(randomTerm)}` +
        `&orientation=landscape` +
        `&w=1920&h=1080` +
        `&content_filter=high` +
        `&featured=true`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();

    // Use the full resolution URL for crisp 1920x1080 images
    const imageUrl = data.urls.full || data.urls.raw;

    // Add parameters to ensure exact dimensions and quality
    const optimizedUrl = `${imageUrl}&w=1920&h=1080&fit=crop&crop=center&q=85`;

    console.log(
      `🖼️ Fetched image: "${data.alt_description}" by ${data.user.name}`
    );

    return optimizedUrl;
  } catch (error) {
    console.error('❌ Error fetching Unsplash image:', error.message);
    return null; // Will use CSS gradient fallback
  }
}

// Function to fetch ayah data from API
async function fetchAyahData(surah, ayah) {
  try {
    const arabicResponse = await fetch(
      `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`
    );
    const englishResponse = await fetch(
      `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/en.sahih`
    );

    const arabicData = await arabicResponse.json();
    const englishData = await englishResponse.json();

    if (!arabicData.data || !englishData.data) {
      throw new Error('Failed to fetch ayah data');
    }

    return {
      arabic: arabicData.data.text,
      translation: englishData.data.text,
      surah: {
        number: arabicData.data.surah.number,
        name: arabicData.data.surah.name,
        englishName: arabicData.data.surah.englishName,
        englishNameTranslation: arabicData.data.surah.englishNameTranslation,
      },
      ayah: {
        number: arabicData.data.numberInSurah,
        numberInQuran: arabicData.data.number,
      },
      reference: `${arabicData.data.surah.englishName} ${arabicData.data.surah.number}:${arabicData.data.numberInSurah}`,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching ayah data:', error);
    throw error;
  }
}

// Function to update current ayah (used by cron job)
async function updateCurrentAyah(category = null) {
  try {
    let selectedAyah;

    if (category && categorizedAyahs[category]) {
      selectedAyah = getRandomAyahFromCategory(category);
    } else {
      // Pick random category and then random ayah from it
      const categories = getAvailableCategories();
      const randomCategory =
        categories[Math.floor(Math.random() * categories.length)];
      selectedAyah = getRandomAyahFromCategory(randomCategory);
    }

    if (!selectedAyah) {
      throw new Error('No ayah found');
    }

    const ayahData = await fetchAyahData(selectedAyah.surah, selectedAyah.ayah);
    currentAyah = ayahData;

    // Fetch new background image
    currentBackgroundImage = await fetchRandomBackgroundImage();
    lastUpdateTime = new Date();

    console.log(
      `✅ Updated ayah: ${
        ayahData.reference
      } at ${lastUpdateTime.toISOString()}`
    );

    if (currentBackgroundImage) {
      console.log('🖼️ Background image updated from Unsplash');
    } else {
      console.log('🎨 Using gradient background (no Unsplash API key)');
    }
  } catch (error) {
    console.error('❌ Error updating current ayah:', error);
  }
}

// API Routes

// Get current ayah (served from memory)
app.get('/api/current-ayah', (req, res) => {
  if (!currentAyah) {
    return res.status(404).json({
      error: 'No current ayah available',
      message: 'Please wait for the system to initialize or fetch a new ayah',
    });
  }

  res.json({
    ...currentAyah,
    backgroundImage: currentBackgroundImage,
    cached: true,
    lastUpdated: lastUpdateTime?.toISOString(),
  });
});

// Get random ayah by category
app.get('/api/ayah/:category', async (req, res) => {
  try {
    const category = req.params.category.toLowerCase();

    if (!categorizedAyahs[category]) {
      return res.status(400).json({
        error: 'Invalid category',
        availableCategories: getAvailableCategories(),
      });
    }

    const selectedAyah = getRandomAyahFromCategory(category);
    if (!selectedAyah) {
      return res.status(404).json({ error: 'No ayah found for this category' });
    }

    const ayahData = await fetchAyahData(selectedAyah.surah, selectedAyah.ayah);
    ayahData.category = category;
    ayahData.backgroundImage = await fetchRandomBackgroundImage();

    res.json(ayahData);
  } catch (error) {
    console.error('Error fetching categorized ayah:', error);
    res.status(500).json({
      error: 'Failed to fetch ayah',
      message: error.message,
    });
  }
});

// Get all available categories
app.get('/api/categories', (req, res) => {
  const categories = getAvailableCategories().map((cat) => ({
    name: cat,
    count: categorizedAyahs[cat].length,
  }));

  res.json({
    categories,
    total: categories.length,
  });
});

// Force refresh current ayah
app.post('/api/refresh', async (req, res) => {
  try {
    const { category } = req.body;
    await updateCurrentAyah(category);
    res.json({
      message: 'Ayah refreshed successfully',
      ayah: currentAyah,
      backgroundImage: currentBackgroundImage,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to refresh ayah',
      message: error.message,
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    currentAyah: currentAyah ? currentAyah.reference : 'None',
    lastUpdate: lastUpdateTime?.toISOString() || 'Never',
    unsplashConfigured:
      UNSPLASH_ACCESS_KEY &&
      UNSPLASH_ACCESS_KEY !== 'YOUR_UNSPLASH_ACCESS_KEY_HERE',
  });
});

// Beautiful HTML page showing current ayah
app.get('/', async (req, res) => {
  // If no current ayah, initialize one immediately
  if (!currentAyah) {
    try {
      await updateCurrentAyah();
    } catch (error) {
      console.error('Failed to initialize ayah:', error);
    }
  }

  // If still no ayah after initialization attempt, show error
  if (!currentAyah) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>🕌 Quran Quote API</title>
          <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  min-height: 100vh;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  color: white;
              }
              .container {
                  text-align: center;
                  padding: 40px;
                  background: rgba(0,0,0,0.3);
                  border-radius: 20px;
                  backdrop-filter: blur(10px);
              }
              h1 { font-size: 2.5rem; margin-bottom: 20px; }
              p { font-size: 1.2rem; margin: 10px 0; }
              a { color: #ffd700; text-decoration: none; }
              a:hover { text-decoration: underline; }
          </style>
          <script>
              // Auto refresh page after 2 seconds
              setTimeout(() => {
                  window.location.reload();
              }, 2000);
          </script>
      </head>
      <body>
          <div class="container">
              <h1>🕌 Quran Quote API</h1>
              <p>Loading...</p>
              <p><a href="/api/categories">View Categories</a></p>
          </div>
      </body>
      </html>
    `);
  }

  // Use Unsplash image if available, otherwise use gradient
  const backgroundStyle = currentBackgroundImage
    ? `background-image: url('${currentBackgroundImage}');`
    : `background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);`;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🕌 Quran Quote - ${currentAyah.reference}</title>
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Inter', sans-serif;
                min-height: 100vh;
                ${backgroundStyle}
                background-size: cover;
                background-position: center;
                background-attachment: fixed;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                overflow-x: hidden;
            }

            /* Dark overlay for better text readability */
            body::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                z-index: 1;
            }

            .container {
                position: relative;
                z-index: 2;
                max-width: 900px;
                margin: 0 auto;
                padding: 60px 40px;
                text-align: center;
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(15px);
                border-radius: 25px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
                animation: fadeIn 1s ease-out;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .arabic-text {
                font-family: 'Amiri', serif;
                font-size: 2.8rem;
                line-height: 1.8;
                color: #ffffff;
                margin: 30px 0;
                direction: rtl;
                text-align: center;
                font-weight: 400;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
                letter-spacing: 0.5px;
            }

            .translation {
                font-family: 'Inter', sans-serif;
                font-size: 1.4rem;
                line-height: 1.7;
                color: #e8f4fd;
                margin: 30px 0;
                font-weight: 300;
                font-style: italic;
                text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
                max-width: 800px;
                margin-left: auto;
                margin-right: auto;
            }

            .reference {
                font-family: 'Inter', sans-serif;
                font-size: 1.1rem;
                color: #b8d4f0;
                margin: 25px 0;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 1px;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }

            .last-updated {
                margin-top: 30px;
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.6);
                font-weight: 300;
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .container {
                    margin: 20px;
                    padding: 40px 25px;
                }
                
                .arabic-text {
                    font-size: 2.2rem;
                    line-height: 1.6;
                }
                
                .translation {
                    font-size: 1.2rem;
                    line-height: 1.6;
                }
                
                .reference {
                    font-size: 1rem;
                }
            }

            @media (max-width: 480px) {
                .arabic-text {
                    font-size: 1.8rem;
                }
                
                .translation {
                    font-size: 1.1rem;
                }
                
                .container {
                    padding: 30px 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="arabic-text">${currentAyah.arabic}</div>
            <div class="translation">"${currentAyah.translation}"</div>
            <div class="reference">${currentAyah.reference}</div>
        </div>

        <script>
            // Check if page should refresh (every 3 hours)
            const lastUpdate = new Date('${currentAyah.lastUpdated}');
            const now = new Date();
            const timeDiff = (now - lastUpdate) / (1000 * 60 * 60); // difference in hours
            
            // If more than 3 hours have passed, refresh
            if (timeDiff >= 3) {
                fetch('/api/refresh', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }).then(() => {
                    window.location.reload();
                }).catch(() => {
                    // If API call fails, just reload the page
                    window.location.reload();
                });
            }

            // Refresh when user comes back to tab after being away
            let pageHidden = false;
            document.addEventListener('visibilitychange', function() {
                if (pageHidden && !document.hidden) {
                    const now = new Date();
                    const lastUpdate = new Date('${currentAyah.lastUpdated}');
                    const timeDiff = (now - lastUpdate) / (1000 * 60 * 60); // difference in hours
                    
                    // If it's been more than 2 hours, refresh
                    if (timeDiff >= 2) {
                        fetch('/api/refresh', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        }).then(() => {
                            window.location.reload();
                        }).catch(() => {
                            window.location.reload();
                        });
                    }
                }
                pageHidden = document.hidden;
            });
        </script>
    </body>
    </html>
  `);
});

// Cron Jobs
// Update ayah every 3 hours
cron.schedule('0 */3 * * *', () => {
  console.log('🕐 3-hourly ayah update triggered');
  updateCurrentAyah();
});

// Daily motivation ayah at 6 AM
cron.schedule('0 6 * * *', () => {
  console.log('🌅 Daily motivation ayah triggered');
  updateCurrentAyah('motivation');
});

// Evening calmness ayah at 8 PM
cron.schedule('0 20 * * *', () => {
  console.log('🌙 Evening calmness ayah triggered');
  updateCurrentAyah('calmness');
});

// Initialize with first ayah immediately when server starts
const initializeServer = async () => {
  try {
    await updateCurrentAyah();
    console.log('✅ Server initialized with first ayah');
  } catch (error) {
    console.error('❌ Failed to initialize server with ayah:', error);
  }
};

// Start the server
app.listen(PORT, async () => {
  console.log(`🚀 Quran Quote API running on port ${PORT}`);
  console.log(`📖 Current ayah: http://localhost:${PORT}/api/current-ayah`);
  console.log(`📚 Categories: http://localhost:${PORT}/api/categories`);
  console.log(
    `🔄 Cron jobs: 3-hourly updates, Daily motivation (6 AM), Evening calmness (8 PM)`
  );

  if (
    !UNSPLASH_ACCESS_KEY ||
    UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY_HERE'
  ) {
    console.log(
      '⚠️  No Unsplash API key configured. Using gradient backgrounds.'
    );
    console.log(
      '   To get beautiful images, set UNSPLASH_ACCESS_KEY environment variable.'
    );
  } else {
    console.log('🖼️  Unsplash API configured for background images');
  }

  // Initialize server with first ayah
  await initializeServer();
});
