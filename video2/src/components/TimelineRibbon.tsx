import React from 'react';
import { useVideoConfig } from 'remotion';
import { COLOR, FONT, RADIUS, alpha } from '../theme/tokens';

interface TimelineRibbonProps {
  boxes: string[];
  checkedCount: number;
  accent?: string;
}

/**
 * NEW: Episode progress ribbon — shows the "three boxes" being checked off.
 * Heimler doesn't have this; it's our two-host episode-sheet metaphor made visual.
 */
export const TimelineRibbon: React.FC<TimelineRibbonProps> = ({
  boxes,
  checkedCount,
  accent = COLOR.gold,
}) => {
  const { width, height } = useVideoConfig();

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.09,
        backgroundColor: alpha(COLOR.night, 0.85),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: width * 0.03,
        zIndex: 20,
        borderTop: `2px solid ${accent}44`,
      }}
    >
      {boxes.map((box, i) => {
        const isChecked = i < checkedCount;
        const isCurrent = i === checkedCount;

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: isChecked || isCurrent ? 1 : 0.4,
            }}
          >
            {/* Checkbox */}
            <div
              style={{
                width: height * 0.035,
                height: height * 0.035,
                border: `2px solid ${isChecked ? accent : COLOR.inkMuted}`,
                borderRadius: RADIUS.sm,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isChecked ? `${accent}33` : 'transparent',
              }}
            >
              {isChecked && (
                <span style={{ color: accent, fontSize: height * 0.03, fontWeight: 'bold' }}>
                  ✓
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: height * 0.025,
                color: isChecked ? COLOR.onNight : COLOR.onNightMuted,
                fontFamily: FONT.text,
                textDecoration: isChecked ? 'none' : 'none',
              }}
            >
              {box}
            </span>
          </div>
        );
      })}
    </div>
  );
};
