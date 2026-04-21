import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://wsiktuycdccvqvtuhhwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzaWt0dXljZGNjdnF2dHVoaHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTk0MzYsImV4cCI6MjA5MjMzNTQzNn0.vSeDHaloTSDepsIcp6Vklmf8pqc4RffN6nPWq7vsqPU'
);

function toICSDate(iso) {
  return iso.replace(/-/g, '') + 'T080000Z';
}

export default async function handler(req, res) {
  const userId = req.query.user;
  if (!userId) return res.status(400).send('Missing user');

  const { data, error } = await sb
    .from('plants')
    .select('*')
    .eq('user_id', userId);

  if (error) return res.status(500).send('Error');

  const plants = data.map(row => row.data);

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fern//Plant Care//EN',
    'CALNAME:🌿 Fern',
    'X-WR-CALNAME:🌿 Fern',
    'X-WR-TIMEZONE:Europe/Amsterdam',
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
  ];

  for (const p of plants) {
    const events = [
      { type: 'Water', next: p.water?.next, every: p.water?.every, emoji: '💧' },
      { type: 'Feed', next: p.feed?.next, every: p.feed?.every, emoji: '🌱' },
      { type: 'Rotate', next: p.rotate?.next, every: p.rotate?.every, emoji: '🔄' },
    ];
    for (const e of events) {
      if (!e.next) continue;
      ics.push('BEGIN:VEVENT');
      ics.push(`UID:${p.id}-${e.type}-${e.next}@fern`);
      ics.push(`DTSTART:${toICSDate(e.next)}`);
      ics.push(`DTEND:${toICSDate(e.next)}`);
      ics.push(`SUMMARY:${e.emoji} ${e.type} ${p.nick}`);
      ics.push(`DESCRIPTION:${p.name} (${p.species})`);
      ics.push('END:VEVENT');
    }
  }

  ics.push('END:VCALENDAR');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(ics.join('\r\n'));
}
