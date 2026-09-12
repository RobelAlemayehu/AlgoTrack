import React, { useState, useEffect } from 'react';
import { Timer, Play, CheckCircle2, Clock, XCircle, ExternalLink, Award, RotateCcw, AlertCircle, Sparkles, BarChart2, Trash2 } from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';

const API = import.meta.env.VITE_API || 'http://localhost:5000';

const PROBLEM_COUNT_OPTIONS = [
  { value: 3, label: '3 Problems' },
  { value: 4, label: '4 Problems (Standard Div.3 / Div.2)' },
  { value: 5, label: '5 Problems (Full Round)' },
  { value: 6, label: '6 Problems (Marathon)' }
];

const RATING_OPTIONS = [
  { value: 800, label: '800 (Newbie)' },
  { value: 900, label: '900' },
  { value: 1000, label: '1000' },
  { value: 1100, label: '1100' },
  { value: 1200, label: '1200 (Pupil)' },
  { value: 1300, label: '1300' },
  { value: 1400, label: '1400 (Specialist)' },
  { value: 1500, label: '1500' },
  { value: 1600, label: '1600 (Expert)' },
  { value: 1700, label: '1700' },
  { value: 1800, label: '1800' },
  { value: 1900, label: '1900 (CM)' },
  { value: 2000, label: '2000' },
  { value: 2100, label: '2100 (Master)' },
  { value: 2200, label: '2200' },
  { value: 2300, label: '2300' },
  { value: 2400, label: '2400 (Grandmaster)' }
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 Minutes (Sprint)' },
  { value: 45, label: '45 Minutes' },
  { value: 60, label: '60 Minutes (1 Hour)' },
  { value: 90, label: '90 Minutes (Standard Round)' },
  { value: 120, label: '120 Minutes (2 Hours)' }
];

function formatTimer(seconds) {
  if (seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [
    h > 0 ? String(h).padStart(2, '0') : null,
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0')
  ].filter(Boolean).join(':');
}

function formatElapsed(seconds) {
  if (seconds === null || seconds === undefined) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function getRatingClass(d) {
  if (!d) return 'rating-gray';
  const num = parseInt(d);
  if (!isNaN(num)) {
    if (num < 1200) return 'rating-green';
    if (num < 1400) return 'rating-green';
    if (num < 1600) return 'rating-cyan';
    if (num < 1900) return 'rating-blue';
    if (num < 2100) return 'rating-violet';
    if (num < 2400) return 'rating-orange';
    return 'rating-red';
  }
  return 'badge-unknown';
}

export default function SimulatorView({ token, showPopup, cfRating = 1200 }) {
  const [loading, setLoading] = useState(true);
  const [activeSim, setActiveSim] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ totalRounds: 0, totalProblemsSolved: 0, avgSolvedPerRound: 0, overallSolveRate: 0 });
  const [timeLeftSec, setTimeLeftSec] = useState(0);

  // Setup Form state
  const [problemCount, setProblemCount] = useState(4);
  const [minRating, setMinRating] = useState(Math.max(800, cfRating - 100));
  const [maxRating, setMaxRating] = useState(cfRating + 300);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Fetch active simulation & history
  const fetchActiveAndHistory = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const activeRes = await fetch(`${API}/api/simulator/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (activeRes.ok) {
        const data = await activeRes.json();
        setActiveSim(data.activeSimulation);
      }

      const histRes = await fetch(`${API}/api/simulator/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (histRes.ok) {
        const hData = await histRes.json();
        setHistory(hData.history || []);
        setStats(hData.stats || {});
      }
    } catch (err) {
      console.error('Failed to fetch simulator data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveAndHistory();
  }, [token]);

  // Live countdown timer ticker
  useEffect(() => {
    if (!activeSim || activeSim.completed) return;

    const updateTimer = () => {
      const startMs = new Date(activeSim.startedAt).getTime();
      const durationMs = activeSim.durationMinutes * 60 * 1000;
      const endMs = startMs + durationMs;
      const remainSec = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
      setTimeLeftSec(remainSec);

      if (remainSec === 0 && !finishing) {
        handleFinishSimulation();
      }
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, [activeSim]);

  // Start new simulation
  const handleStartSimulation = async (e) => {
    e?.preventDefault();
    if (!token) return;
    setStarting(true);

    try {
      const res = await fetch(`${API}/api/simulator/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          problemCount: Number(problemCount),
          minRating: Number(minRating),
          maxRating: Number(maxRating),
          durationMinutes: Number(durationMinutes)
        })
      });

      const data = await res.json();
      if (res.ok && data.simulation) {
        setActiveSim(data.simulation);
        showPopup?.('Simulation Started!', `Timer running for ${data.simulation.durationMinutes} mins`, 'success');
      } else {
        showPopup?.('Error', data.error || 'Failed to start simulation.', 'error');
      }
    } catch (err) {
      console.error('Failed to start simulation:', err);
      showPopup?.('Error', 'Network error starting simulation.', 'error');
    } finally {
      setStarting(false);
    }
  };

  // Mark problem status during simulation
  const handleMarkProblem = async (problemId, status) => {
    if (!token || !activeSim) return;
    try {
      const res = await fetch(`${API}/api/simulator/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          simulationId: activeSim._id,
          problemId,
          status
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveSim(data.simulation);
      }
    } catch (err) {
      console.error('Failed to mark problem:', err);
    }
  };

  // Finish simulation
  const handleFinishSimulation = async () => {
    if (!token || !activeSim || finishing) return;
    setFinishing(true);

    try {
      const res = await fetch(`${API}/api/simulator/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ simulationId: activeSim._id })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveSim(null);
        showPopup?.(
          'Simulation Ended!',
          `You solved ${data.simulation.solvedCount} / ${data.simulation.problemCount} problems.`,
          'success'
        );
        fetchActiveAndHistory();
      }
    } catch (err) {
      console.error('Failed to finish simulation:', err);
    } finally {
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <div className="view-pad animate-fade-in" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 380, gap: 16 }}>
        <div className="spinner-glow-container">
          <div className="spinner-outer-ring" />
          <div className="spinner-inner-ring" />
          <Timer size={26} style={{ color: 'var(--accent)', zIndex: 2 }} />
        </div>
        <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Loading Contest Simulator…</p>
      </div>
    );
  }

  // ── ACTIVE SIMULATION VIEW ──────────────────────────────────────────────────
  if (activeSim && !activeSim.completed) {
    const solvedCount = activeSim.problems.filter(p => p.status === 'solved').length;
    const isTimeWarning = timeLeftSec > 0 && timeLeftSec < 300;

    return (
      <div className="view-pad animate-fade-in" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Active Header Rail */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 16, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-dot" />
              <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Contest Simulation In Progress
              </h1>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
              Rating Range: {activeSim.minRating} - {activeSim.maxRating} • {solvedCount} / {activeSim.problemCount} Solved
            </p>
          </div>

          {/* Countdown Clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              className="glass"
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: '1px solid ' + (isTimeWarning ? 'rgba(248,81,73,0.5)' : 'var(--accent)'),
                background: isTimeWarning ? 'rgba(248,81,73,0.1)' : 'var(--bg-surface)'
              }}
            >
              <Clock size={20} style={{ color: isTimeWarning ? 'var(--cf-red)' : 'var(--accent)' }} />
              <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: isTimeWarning ? 'var(--cf-red)' : 'var(--text-primary)' }}>
                {formatTimer(timeLeftSec)}
              </span>
            </div>

            <button
              disabled={finishing}
              onClick={handleFinishSimulation}
              className="btn-primary"
              style={{ background: 'var(--cf-red)', borderColor: 'var(--cf-red)', padding: '10px 16px', fontSize: 13, gap: 6 }}
            >
              <CheckCircle2 size={15} /> {finishing ? 'Evaluating...' : 'End & Submit Round'}
            </button>
          </div>
        </div>

        {/* Problems List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {activeSim.problems.map((p, idx) => {
            const isSolved = p.status === 'solved';
            const isAttempted = p.status === 'attempted';
            const isSkipped = p.status === 'skipped';

            return (
              <div
                key={p.problemId}
                className="glass"
                style={{
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  border: '1px solid ' + (isSolved ? 'rgba(63,185,80,0.4)' : (isAttempted ? 'rgba(240,136,62,0.4)' : 'var(--border)')),
                  background: isSolved ? 'rgba(63,185,80,0.04)' : 'var(--bg-base)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                      PROBLEM {String.fromCharCode(65 + idx)}
                    </span>
                    <span className={getRatingClass(p.difficulty)} style={{ fontSize: 11 }}>
                      Rating {p.difficulty}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    {p.title}
                  </h3>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {p.tags?.slice(0, 3).map(t => (
                      <span key={t} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-muted)' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Direct Link & Marking Controls */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost"
                    style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(240,136,62,0.3)' }}
                  >
                    Solve on Codeforces <ExternalLink size={13} />
                  </a>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleMarkProblem(p.problemId, 'solved')}
                      style={{
                        flex: 1, padding: '5px 4px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                        cursor: 'pointer', border: '1px solid ' + (isSolved ? 'var(--cf-green)' : 'var(--border)'),
                        background: isSolved ? 'rgba(63,185,80,0.2)' : 'var(--bg-surface)',
                        color: isSolved ? 'var(--cf-green)' : 'var(--text-secondary)'
                      }}
                    >
                      ✓ Solved {p.markTimestamp !== null && isSolved && `(${formatElapsed(p.markTimestamp)})`}
                    </button>

                    <button
                      onClick={() => handleMarkProblem(p.problemId, 'attempted')}
                      style={{
                        flex: 1, padding: '5px 4px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                        cursor: 'pointer', border: '1px solid ' + (isAttempted ? 'var(--accent)' : 'var(--border)'),
                        background: isAttempted ? 'var(--accent-dim)' : 'var(--bg-surface)',
                        color: isAttempted ? 'var(--accent)' : 'var(--text-secondary)'
                      }}
                    >
                      ⚡ Attempted
                    </button>

                    <button
                      onClick={() => handleMarkProblem(p.problemId, 'skipped')}
                      style={{
                        padding: '5px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                        cursor: 'pointer', border: '1px solid ' + (isSkipped ? 'var(--cf-red)' : 'var(--border)'),
                        background: isSkipped ? 'rgba(248,81,73,0.15)' : 'var(--bg-surface)',
                        color: isSkipped ? 'var(--cf-red)' : 'var(--text-muted)'
                      }}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── SETUP & HISTORY VIEW ────────────────────────────────────────────────────
  return (
    <div className="view-pad animate-fade-in" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Timer size={20} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Time-Boxed Contest Simulator</h1>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
            Simulate real timed competitive rounds with live Codeforces auto-verification
          </p>
        </div>
      </div>

      {/* Setup Form + Overall Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Setup Card */}
        <div className="glass" style={{ borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Configure New Contest Round</h2>

          <form onSubmit={handleStartSimulation} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                Number of Problems
              </label>
              <CustomSelect
                value={problemCount}
                options={PROBLEM_COUNT_OPTIONS}
                onChange={v => setProblemCount(Number(v))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                  Min Rating
                </label>
                <CustomSelect
                  value={minRating}
                  options={RATING_OPTIONS}
                  onChange={v => setMinRating(Number(v))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                  Max Rating
                </label>
                <CustomSelect
                  value={maxRating}
                  options={RATING_OPTIONS}
                  onChange={v => setMaxRating(Number(v))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                Duration
              </label>
              <CustomSelect
                value={durationMinutes}
                options={DURATION_OPTIONS}
                onChange={v => setDurationMinutes(Number(v))}
              />
            </div>

            <button
              disabled={starting}
              type="submit"
              className="btn-primary"
              style={{ marginTop: 6, padding: '10px 16px', fontSize: 13, width: '100%', justifyContent: 'center', gap: 8 }}
            >
              <Play size={15} /> {starting ? 'Generating Round...' : 'Start Contest Simulation'}
            </button>
          </form>
        </div>

        {/* Stats & Overview Card */}
        <div className="glass" style={{ borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Simulator Performance Analytics</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="glass" style={{ padding: 14, borderRadius: 6, background: 'var(--bg-base)' }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Rounds Completed</span>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>{stats.totalRounds || 0}</p>
            </div>

            <div className="glass" style={{ padding: 14, borderRadius: 6, background: 'var(--bg-base)' }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Avg Solved / Round</span>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--cf-green)', marginTop: 4 }}>{stats.avgSolvedPerRound || 0}</p>
            </div>

            <div className="glass" style={{ padding: 14, borderRadius: 6, background: 'var(--bg-base)' }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Total Contest Solves</span>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{stats.totalProblemsSolved || 0}</p>
            </div>

            <div className="glass" style={{ padding: 14, borderRadius: 6, background: 'var(--bg-base)' }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Overall Solve Rate</span>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--cf-cyan)', marginTop: 4 }}>{stats.overallSolveRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Past Contest Round History */}
      <div className="glass" style={{ borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Past Contest Simulation History</h2>

        {history.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            No completed contest simulations yet. Configure a round above to start practicing!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map(sim => {
              const dateStr = new Date(sim.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <div
                  key={sim._id}
                  className="glass"
                  style={{ padding: 14, borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {dateStr} Round ({sim.durationMinutes}m)
                      </span>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4 }}>
                        Rating {sim.minRating}-{sim.maxRating}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      {sim.problems.map((p, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 11, fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 4,
                            background: p.status === 'solved' ? 'rgba(63,185,80,0.15)' : 'var(--bg-muted)',
                            color: p.status === 'solved' ? 'var(--cf-green)' : 'var(--text-muted)',
                            border: '1px solid ' + (p.status === 'solved' ? 'rgba(63,185,80,0.3)' : 'var(--border)')
                          }}
                        >
                          {p.title} {p.status === 'solved' ? '✓' : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cf-green)', fontFamily: 'var(--font-mono)' }}>
                      {sim.solvedCount} / {sim.problemCount} Solved
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
