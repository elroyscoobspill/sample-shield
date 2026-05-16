\
'use client';

import { useState } from 'react';

function riskFromScore(score) {
  if (score >= 80) return { label: 'High', cls: 'high' };
  if (score >= 55) return { label: 'Medium', cls: 'med' };
  return { label: 'Low', cls: 'low' };
}

function sourceFromNotes(notes, idx) {
  const lines = (notes || '').split('\n').map(x => x.trim()).filter(Boolean);
  return lines[idx] || 'No source/origin note entered';
}

export default function Home() {
  const [track, setTrack] = useState(null);
  const [sourceNotes, setSourceNotes] = useState('');
  const [results, setResults] = useState([]);
  const [log, setLog] = useState('Ready. Upload a beat/track and scan it through ACRCloud.');
  const [busy, setBusy] = useState(false);

  function addLog(msg) {
    setLog(prev => prev + '\n' + msg);
  }

  async function scan() {
    if (!track) {
      alert('Upload your beat/track first.');
      return;
    }

    setBusy(true);
    setResults([]);
    setLog('Starting ACRCloud scan...');

    try {
      const form = new FormData();
      form.append('file', track);
      form.append('sourceNotes', sourceNotes || '');

      addLog('Uploading to private backend...');
      const res = await fetch('/api/recognize', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Scan failed');
      }

      const music = data?.metadata?.music || [];
      const mapped = music.map((m, idx) => ({
        title: m.title || 'Unknown title',
        artists: (m.artists || []).map(a => a.name).join(', ') || 'Unknown artist',
        album: m.album?.name || '',
        releaseDate: m.release_date || '',
        label: m.label || '',
        score: Number(m.score || 0),
        acrid: m.acrid || '',
        external: m.external_metadata || {},
        sourceNote: sourceFromNotes(sourceNotes, idx),
        playOffset: m.play_offset_ms ? Math.round(m.play_offset_ms / 1000) : null
      }));

      setResults(mapped);
      addLog(`ACRCloud status: ${data?.status?.msg || 'done'}`);
      addLog(`Matches found: ${mapped.length}`);

      if (!mapped.length) {
        addLog('No commercial database match found. This does NOT guarantee clearance.');
      }
    } catch (err) {
      addLog('ERROR: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  const topScore = results.length ? Math.max(...results.map(r => r.score)) : 0;
  const topRisk = riskFromScore(topScore);

  return (
    <main>
      <section className="hero">
        <div className="tag"><span className="dot"></span> Private scanner for Elroy + ScoobRoc</div>
        <h1>Sample Shield</h1>
        <p>
          Upload a beat or track and scan it through ACRCloud music recognition.
          This checks for commercial music matches and returns possible flagged songs, artists,
          confidence scores, metadata, and your source notes.
        </p>

        <div className="grid">
          <section className="card">
            <label>1. Upload beat / track</label>
            <input type="file" accept="audio/*" onChange={e => setTrack(e.target.files?.[0] || null)} />
            <div className="hint">Best: MP3, WAV, M4A. Use short test files first.</div>

            <label>2. Source notes / where it came from</label>
            <textarea
              value={sourceNotes}
              onChange={e => setSourceNotes(e.target.value)}
              placeholder={'Example:\nSplice - Soul Keys Loop 92BPM\nTracklib sample ID / license page\nYouTube chop source'}
            />

            <button disabled={busy} onClick={scan}>
              {busy ? 'Scanning...' : 'Scan with ACRCloud'}
            </button>

            <div className="meters">
              <div className="meter">
                <strong>{results.length ? topScore : '—'}</strong>
                <span>top confidence</span>
              </div>
              <div className="meter">
                <strong>{results.length ? topRisk.label : '—'}</strong>
                <span>risk level</span>
              </div>
              <div className="meter">
                <strong>{results.length}</strong>
                <span>matches</span>
              </div>
            </div>
          </section>

          <aside className="card">
            <label>Scan log</label>
            <div className="log">{log}</div>
          </aside>
        </div>

        <section className="card results">
          <label>Results</label>
          {!results.length && <p>No matches yet. Run a scan first.</p>}

          {results.map((r, idx) => {
            const risk = riskFromScore(r.score);
            return (
              <div className="result" key={idx}>
                <div>
                  <span className={`pill ${risk.cls}`}>{risk.label} risk</span>
                  <span className="pill">Confidence: {r.score}</span>
                  {r.playOffset !== null && <span className="pill">Reference offset: {r.playOffset}s</span>}
                </div>
                <h3>{r.title}</h3>
                <p><b>Artist:</b> {r.artists}</p>
                {r.album && <p><b>Album:</b> {r.album}</p>}
                {r.label && <p><b>Label:</b> {r.label}</p>}
                {r.releaseDate && <p><b>Release:</b> {r.releaseDate}</p>}
                <p><b>Your source note:</b> {r.sourceNote}</p>
                <p className="small">
                  Note: a clean result is not a legal clearance guarantee. ACRCloud can identify many released recordings,
                  but it may miss obscure, heavily chopped, reversed, replayed, or transformed samples.
                </p>
              </div>
            );
          })}
        </section>
      </section>
    </main>
  );
}
