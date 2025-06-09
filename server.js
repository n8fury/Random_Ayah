const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the widget HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to get random ayah
app.get('/api/random-ayah', async (req, res) => {
  try {
    // Generate random surah (1-114) and ayah number
    const randomSurah = Math.floor(Math.random() * 114) + 1;

    // First get surah info to know how many ayahs it has
    const surahInfoResponse = await fetch(
      `https://api.alquran.cloud/v1/surah/${randomSurah}`
    );
    const surahInfo = await surahInfoResponse.json();

    if (!surahInfo.data) {
      throw new Error('Failed to fetch surah info');
    }

    const totalAyahs = surahInfo.data.numberOfAyahs;
    const randomAyah = Math.floor(Math.random() * totalAyahs) + 1;

    // Fetch the specific ayah in Arabic and English
    const arabicResponse = await fetch(
      `https://api.alquran.cloud/v1/ayah/${randomSurah}:${randomAyah}/ar.alafasy`
    );
    const englishResponse = await fetch(
      `https://api.alquran.cloud/v1/ayah/${randomSurah}:${randomAyah}/en.sahih`
    );

    const arabicData = await arabicResponse.json();
    const englishData = await englishResponse.json();

    if (!arabicData.data || !englishData.data) {
      throw new Error('Failed to fetch ayah data');
    }

    // Format the response
    const response = {
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
      reference: `${arabicData.data.surah.englishName} ${arabicData.data.numberInSurah}:${arabicData.data.surah.number}`,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching ayah:', error);
    res.status(500).json({
      error: 'Failed to fetch ayah',
      message: error.message,
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📖 Widget available at: http://localhost:${PORT}`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api/random-ayah`);
});
