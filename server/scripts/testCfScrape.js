const axios = require('axios');

async function testCfScrape() {
  const handle = 'robelalemayehu';
  try {
    const res = await axios.get(`https://codeforces.com/profile/${handle}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    const html = res.data;
    console.log('HTML length:', html.length);

    // Look for numbers like "70 problems solved" or "_rating_70" or "_solved" or scripts
    const matches = html.match(/\d+\s+problems?\s+solved/gi);
    console.log('Regex matches for "problems solved":', matches);

    // Search for any JSON or script data in the profile page
    const scriptMatches = html.match(/var\s+[\w_]+\s*=\s*[\s\S]*?;/g) || [];
    console.log('Script matches count:', scriptMatches.length);
    scriptMatches.forEach((s, i) => {
      if (s.includes('solved') || s.includes('70') || s.includes('submission')) {
        console.log(`Script ${i}:`, s.slice(0, 300));
      }
    });

  } catch (err) {
    console.error('Scrape error:', err.message);
  }
}

testCfScrape();
