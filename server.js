const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

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
    lastUpdateTime = new Date();

    console.log(
      `✅ Updated ayah: ${
        ayahData.reference
      } at ${lastUpdateTime.toISOString()}`
    );
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
  });
});

// Simple HTML page showing current ayah
app.get('/', (req, res) => {
  if (!currentAyah) {
    return res.send(`
            <html>
                <head><title>Quran Quote API</title></head>
                <body style="font-family: Arial; padding: 20px; text-align: center;">
                    <h1>🕌 Quran Quote API</h1>
                    <p>System initializing... Please wait.</p>
                    <p><a href="/api/categories">View Categories</a></p>
                </body>
            </html>
        `);
  }

  res.send(`
        <html>
            <head>
                <title>Quran Quote API</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial; padding: 20px; text-align: center; }
                    .arabic { font-size: 24px; margin: 20px 0; direction: rtl; }
                    .translation { font-style: italic; margin: 15px 0; }
                    .source { color: #666; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="arabic">${currentAyah.arabic}</div>
                <div class="translation">${currentAyah.translation}</div>
                <div class="source">${currentAyah.reference}</div>
            </body>
        </html>
    `);
});

// Cron Jobs
// Update ayah every hour
cron.schedule('0 * * * *', () => {
  console.log('🕐 Hourly ayah update triggered');
  updateCurrentAyah();
});

// Update ayah every 6 hours with random category
cron.schedule('0 */6 * * *', () => {
  console.log('🕕 6-hourly ayah update triggered');
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

// Initialize with first ayah
updateCurrentAyah();

app.listen(PORT, () => {
  console.log(`🚀 Quran Quote API running on port ${PORT}`);
  console.log(`📖 Current ayah: http://localhost:${PORT}/api/current-ayah`);
  console.log(`📚 Categories: http://localhost:${PORT}/api/categories`);
  console.log(
    `🔄 Cron jobs: Hourly updates, Daily motivation (6 AM), Evening calmness (8 PM)`
  );
});
