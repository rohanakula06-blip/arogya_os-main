import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1]] = val;
  }
});

const geminiKey = env.VITE_GEMINI_API_KEY;

async function testGemini() {
  const models = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-flash-latest'];
  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with JSON: {"status": "ok"}' }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      console.log(`Model [${model}] status:`, res.status);
      if (res.ok) {
        const data = await res.json();
        console.log(`Model [${model}] success:`, data?.candidates?.[0]?.content?.parts?.[0]?.text);
        return;
      } else {
        const err = await res.text();
        console.log(`Model [${model}] error:`, err);
      }
    } catch (e) {
      console.log(`Model [${model}] fetch error:`, e.message);
    }
  }
}

testGemini();
