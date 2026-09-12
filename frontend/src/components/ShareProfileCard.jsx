import React, { useRef } from 'react';
import { Share2, Download, Copy, Check } from 'lucide-react';

export default function ShareProfileCard({ user, totalSolved, lcCount, cfCount, streak, badgesCount, showPopup }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = React.useState(false);

  const generateCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = 600;
    canvas.height = 340;

    // Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 600, 340);
    gradient.addColorStop(0, '#0D1117');
    gradient.addColorStop(1, '#161B22');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 340);

    // Border
    ctx.strokeStyle = '#30363D';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 580, 320);

    // Header Branding
    ctx.fillStyle = '#F0883E';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText('AlgoTrack v2.0', 30, 45);

    ctx.fillStyle = '#8B949E';
    ctx.font = '12px monospace';
    ctx.fillText('Competitive Programming Progress Card', 30, 65);

    // Username
    ctx.fillStyle = '#C9D1D9';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText(`Coder: @${user?.username || 'user'}`, 30, 110);

    // Stat Cards (Total Solved, LC, CF, Streak, Badges)
    const drawCard = (x, y, w, h, label, value, color) => {
      ctx.fillStyle = '#21262D';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#30363D';
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = '#8B949E';
      ctx.font = '10px monospace';
      ctx.fillText(label, x + 12, y + 22);

      ctx.fillStyle = color;
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.fillText(String(value), x + 12, y + 54);
    };

    drawCard(30, 130, 160, 70, 'TOTAL SOLVED', totalSolved || 0, '#F0883E');
    drawCard(210, 130, 160, 70, 'LEETCODE', lcCount || 0, '#FFA116');
    drawCard(390, 130, 160, 70, 'CODEFORCES', cfCount || 0, '#4D9DE0');

    drawCard(30, 220, 250, 70, 'CURRENT STREAK', `${streak || 0} Days 🔥`, '#3FB850');
    drawCard(300, 220, 250, 70, 'EARNED BADGES', `${badgesCount || 0} Badges 🏆`, '#F0883E');

    // Footer
    ctx.fillStyle = '#8B949E';
    ctx.font = '10px monospace';
    ctx.fillText('Verified by AlgoTrack Ledger', 30, 315);
  };

  React.useEffect(() => {
    generateCanvas();
  }, [user, totalSolved, lcCount, cfCount, streak, badgesCount]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `algotrack_stats_${user?.username || 'coder'}.png`;
    a.click();
    showPopup?.('Image Downloaded', 'Profile stats card saved as PNG.', 'success');
  };

  const handleCopyText = () => {
    const text = `🏆 AlgoTrack Stats for @${user?.username || 'coder'}:\n• Total Solved: ${totalSolved || 0} problems (${lcCount || 0} LC, ${cfCount || 0} CF)\n• Active Streak: ${streak || 0} Days 🔥\n• Badges Earned: ${badgesCount || 0} 🏆\nTrack your progress on AlgoTrack!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showPopup?.('Copied to Clipboard', 'Profile summary text copied!', 'success');
  };

  return (
    <div className="glass" style={{ borderRadius: 8, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Share2 size={16} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Shareable Profile Card</h2>
        </div>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Export Progress</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <canvas ref={canvasRef} style={{ borderRadius: 8, border: '1px solid var(--border)', maxWidth: '100%', height: 'auto' }} />

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={handleDownload} style={{ fontSize: 12, gap: 6 }}>
            <Download size={13} /> Download PNG Card
          </button>
          <button className="btn-ghost" onClick={handleCopyText} style={{ fontSize: 12, gap: 6 }}>
            {copied ? <Check size={13} style={{ color: 'var(--cf-green)' }} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy Summary Text'}
          </button>
        </div>
      </div>
    </div>
  );
}
