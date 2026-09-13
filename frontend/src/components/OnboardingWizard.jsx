import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, Check, HelpCircle } from 'lucide-react';
import { API } from '../config/api';

const TOUR_STEPS = [
  {
    target: 'profile',
    title: '1. Profile & Handles',
    description: 'Start by configuring your LeetCode and Codeforces handles in Profile so AlgoTrack can sync your solved problems and rating stats.',
    arrowDirection: 'left'
  },
  {
    target: 'sync',
    title: '2. Sync Problem Data',
    description: 'Click "Sync Now" anytime to pull your latest problem solves, submissions, and contest rating updates.',
    arrowDirection: 'top'
  },
  {
    target: 'drill',
    title: '3. Weak-Topic Drills',
    description: 'Generate targeted practice drills focused on your lowest accuracy topic tags to sharpen your weak spots.',
    arrowDirection: 'left'
  },
  {
    target: 'groups',
    title: '4. Study Groups & Leaderboards',
    description: 'Form private study circles with friends, share invite codes, and compete on live weekly & monthly leaderboards.',
    arrowDirection: 'left'
  },
  {
    target: 'roadmaps',
    title: '5. Structured Roadmaps',
    description: 'Follow structured DSA topic paths (Trees, Graphs, DP, Binary Search) to systematically master algorithms.',
    arrowDirection: 'left'
  }
];

export default function OnboardingWizard({
  isOpen,
  onClose,
  token
}) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [completing, setCompleting] = useState(false);

  const step = TOUR_STEPS[currentStepIdx];
  const totalSteps = TOUR_STEPS.length;

  useEffect(() => {
    if (!isOpen) return;

    const updateTargetPosition = () => {
      if (!step) return;
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom
        });
      } else {
        setTargetRect(null);
      }
    };

    updateTargetPosition();
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);
    const interval = setInterval(updateTargetPosition, 300);

    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
      clearInterval(interval);
    };
  }, [isOpen, currentStepIdx, step]);

  if (!isOpen) return null;

  const handleFinish = async () => {
    setCompleting(true);
    try {
      await fetch(`${API}/api/auth/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ completed: true })
      });
    } catch (err) {
      console.error('Failed to save onboarding completion:', err);
    } finally {
      setCompleting(false);
      onClose();
    }
  };

  const handleNext = async () => {
    if (currentStepIdx < totalSteps - 1) {
      setCurrentStepIdx(idx => idx + 1);
    } else {
      await handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(idx => idx - 1);
    }
  };

  // Calculate popover callout coordinates
  let popoverStyle = {
    position: 'fixed',
    zIndex: 10001,
    width: 320
  };

  let arrowStyle = {
    position: 'absolute',
    width: 0, height: 0
  };

  if (targetRect) {
    if (step.arrowDirection === 'left') {
      popoverStyle.left = Math.min(targetRect.right + 14, window.innerWidth - 340);
      popoverStyle.top = Math.max(16, Math.min(targetRect.top - 8, window.innerHeight - 240));
      arrowStyle = {
        left: -8,
        top: Math.max(16, targetRect.top - popoverStyle.top + (targetRect.height / 2) - 8),
        borderTop: '8px solid transparent',
        borderBottom: '8px solid transparent',
        borderRight: '8px solid var(--bg-surface)'
      };
    } else if (step.arrowDirection === 'top') {
      popoverStyle.left = Math.max(16, Math.min(targetRect.left - 120, window.innerWidth - 340));
      popoverStyle.top = targetRect.bottom + 14;
      arrowStyle = {
        top: -8,
        left: Math.max(16, targetRect.left - popoverStyle.left + (targetRect.width / 2) - 8),
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderBottom: '8px solid var(--bg-surface)'
      };
    }
  } else {
    // Fallback position if element not immediately rendered
    popoverStyle.left = 260;
    popoverStyle.top = 100;
  }

  return (
    <>
      {/* Crisp dimming backdrop overlay without any blur so text & icons remain 100% sharp */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.35)',
        zIndex: 9999, pointerEvents: 'auto'
      }} onClick={onClose} />

      {/* Target Element Highlight Glowing Ring */}
      {targetRect && (
        <div style={{
          position: 'fixed',
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          borderRadius: 8,
          boxShadow: '0 0 0 2px var(--accent), 0 0 20px rgba(240, 136, 62, 0.5)',
          zIndex: 10000,
          pointerEvents: 'none',
          transition: 'all 0.25s ease'
        }} />
      )}

      {/* Speech Bubble / Callout Popover */}
      <div
        className="animate-fade-in glass"
        style={{
          ...popoverStyle,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        {/* Pointer Arrow Tail */}
        <div style={arrowStyle} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
              color: 'var(--accent)', background: 'rgba(240, 136, 62, 0.12)',
              padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(240, 136, 62, 0.3)'
            }}>
              Step {currentStepIdx + 1} of {totalSteps}
            </span>
          </div>

          <button
            onClick={handleFinish}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2
            }}
            title="Skip Tour"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div>
          <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            {step.title}
          </h4>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            {step.description}
          </p>
        </div>

        {/* Footer Navigation */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4
        }}>
          <button
            onClick={handleBack}
            disabled={currentStepIdx === 0 || completing}
            className="btn-secondary"
            style={{
              fontSize: 12, padding: '5px 12px', height: 30,
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'var(--bg-muted)', color: 'var(--text-primary)',
              border: '1px solid var(--border)', borderRadius: 6,
              cursor: currentStepIdx === 0 || completing ? 'not-allowed' : 'pointer',
              visibility: currentStepIdx === 0 ? 'hidden' : 'visible'
            }}
          >
            <ChevronLeft size={14} /> Back
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleFinish}
              className="btn-ghost"
              style={{ fontSize: 11, padding: '4px 8px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              Skip
            </button>

            <button
              onClick={handleNext}
              disabled={completing}
              className="btn-primary"
              style={{
                fontSize: 12, padding: '5px 14px', height: 30,
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'var(--accent)', color: '#0D1117',
                border: 'none', borderRadius: 6, fontWeight: 600,
                cursor: completing ? 'not-allowed' : 'pointer'
              }}
            >
              {currentStepIdx === totalSteps - 1 ? (
                <>Finish <Check size={14} /></>
              ) : (
                <>Next <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
