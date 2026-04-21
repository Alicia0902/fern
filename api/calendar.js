Ga naar `api/calendar.js` in GitHub → klik het potlood → vervang alles met:

```javascript
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://wsiktuycdccvqvtuhhwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzaWt0dXljZGNjdnF2dHVoaHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTk0MzYsImV4cCI6MjA5MjMzNTQzNn0.vSeDHaloTSDepsIcp6Vklmf8pqc4RffN6nPWq7vsqPU'
);

function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function toICSDate(iso) {
  return iso.replace(/-/g, '');
}

module.exports = async function handler(req, res) {
  const userId = req.query.user;
  if (!userId) return res.status(400).send('Missing user');

  const { data, error } = await sb
    .from('plants')
    .select('*')
    .eq('user_id', userId);

  if (error) return res.status(500).send('Error: ' + error.message);

  const plants = (data || []).map(row => row.data);
  const MONTHS_AHEAD = 6;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() + MONTHS_AHEAD);
  const cutoffISO = cutoff.toISOString().split('T')[0];

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fern//Plant Care//EN',
    'X-WR-CALNAME:🌿 Fern',
    'X-WR-TIMEZONE:Europe/Amsterdam',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
  ];

  for (const p of plants) {
    const tasks = [
      { type:'Water', next:p.water?.next, every:p.water?.every, emoji:'💧' },
      { type:'Feed',  next:p.feed?.next,  every:p.feed?.every,  emoji:'🌱' },
      { type:'Rotate',next:p.rotate?.next,every:p.rotate?.every,emoji:'🔄' },
    ];

    for (const t of tasks) {
      if (!t.next || !t.every) continue;
      let current = t.next;
      let occurrence = 0;

      while (current <= cutoffISO) {
        ics.push('BEGIN:VEVENT');
        ics.push(`UID:${p.id}-${t.type}-${occurrence}@fern`);
        ics.push(`DTSTART;VALUE=DATE:${toICSDate(current)}`);
        ics.push(`DTEND;VALUE=DATE:${toICSDate(current)}`);
        ics.push(`SUMMARY:${t.emoji} ${t.type} ${p.nick}`);
        ics.push(`DESCRIPTION:${p.name} (${p.species}) — every ${t.every} days`);
        ics.push('END:VEVENT');

        current = addDays(current, t.every);
        occurrence++;
      }
    }
  }

  ics.push('END:VCALENDAR');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(ics.join('\r\n'));
};
