import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';
import {FONT, COLOR, TYPE, RADIUS, alpha} from '../../theme/tokens';

/** Time-control contract: phases as 0-1 fractions of duration. No literal frame numbers. */
export interface Phase {name: string; start: number; end: number}
export interface BoycottPressureProps {
  durationInFrames?: number;
  phases: Phase[];
}

const DEFAULT_PHASES: Phase[] = [
  {name: 'setup', start: 0, end: 0.15},
  {name: 'boycott', start: 0.15, end: 0.5},
  {name: 'pain', start: 0.5, end: 0.8},
  {name: 'repeal', start: 0.8, end: 1.0},
];

/** Colonial ports (y fractions) where ships are turned away. */
const PORTS = [0.34, 0.5, 0.66];

export const BoycottPressure: React.FC<BoycottPressureProps> = ({
  durationInFrames: propDuration,
  phases = DEFAULT_PHASES,
}) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames: configDuration} = useVideoConfig();
  const durationInFrames = propDuration ?? configDuration;
  const u = width / 1280; // scale token sizes with u = width/1280
  const total = Math.max(1, durationInFrames);

  const getPhase = (name: string): Phase =>
    phases.find(p => p.name === name) ?? {name, start: 0, end: 1};
  const pt = (name: string) => {
    const p = getPhase(name);
    return interpolate(frame, [p.start * total, p.end * total], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    });
  };

  const setupT = pt('setup');
  const boycottT = pt('boycott');
  const painT = pt('pain');
  const repealT = pt('repeal');

  // ---- Layout (1280x720 space; u scales nothing here — keep honest to u = width/1280 upstream)
  const colonyX = 230 * u;
  const britainX = 1050 * u;
  const midX = (colonyX + britainX) / 2;
  const landY = 180;
  const landH = 360;

  // ---- Ships -----------------------------------------------------------------
  // setup → sail Britain→colonies loaded. boycott → approach the port, U-turn, sail back empty.
  const shipY = [330, 420, 510];
  const portX = colonyX + 130;
  const ships = shipY.map((y, i) => {
    const out = interpolate(setupT, [i * 0.22, Math.min(1, i * 0.22 + 0.55)], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic),
    });
    const b = interpolate(boycottT, [i * 0.18, Math.min(1, i * 0.18 + 0.62)], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic),
    });
    let x: number, dir: number, loaded: boolean, turned = false;
    if (b > 0) {
      if (b < 0.3) {
        // approach the port, still loaded
        x = interpolate(b, [0, 0.3], [portX + 60, portX]);
        dir = -1; loaded = true;
      } else if (b < 0.5) {
        // the U-turn: swing around just off the port
        const u2 = interpolate(b, [0.3, 0.5], [0, 1]);
        x = portX + Math.sin(u2 * Math.PI) * 40;
        dir = u2 < 0.5 ? -1 : 1; loaded = u2 < 0.5;
      } else {
        // sailing home empty
        x = interpolate(b, [0.5, 1], [portX, britainX], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        dir = 1; loaded = false; turned = true;
      }
    } else {
      x = britainX - (britainX - (portX + 60)) * out;
      dir = -1; loaded = true;
    }
    const dim = painT > 0.02 && turned ? 0.25 : 1; // docked & dim once pain starts
    return {x, y, dir, loaded, dim, i};
  });

  // ---- Trade-flow arrow -------------------------------------------------------
  const arrowFlow = interpolate(boycottT, [0, 0.35], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }); // 1 = Britain→colonies flowing, 0 = reversed/dimmed
  const arrowOpacity = 0.25 + 0.75 * arrowFlow + 0.15 * Math.sin(frame / 12);
  const arrowX1 = arrowFlow > 0.5 ? britainX - 90 : colonyX + 200;
  const arrowX2 = arrowFlow > 0.5 ? colonyX + 200 : britainX - 90;
  const arrowDash = -frame * 3; // marching dashes, direction-agnostic pulse

  // ---- Ledger numbers tick down through pain ----------------------------------
  const revenue = Math.round(interpolate(painT, [0, 1], [100, 40]));
  const debts = Math.round(interpolate(painT, [0, 1], [12, 55]));
  const ledgerOpacity = interpolate(painT, [0, 0.25], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // ---- NONIMPORTATION stamp ---------------------------------------------------
  const stampScale = interpolate(boycottT, [0.25, 0.5], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6)),
  });
  const stampOpacity = interpolate(repealT, [0, 0.3], [1, 0.15], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // ---- Petition stack ----------------------------------------------------------
  const petitions = [0, 1, 2, 3].map(i =>
    interpolate(painT, [0.3 + i * 0.12, 0.42 + i * 0.12], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
    }),
  );

  // ---- Repeal banner ------------------------------------------------------------
  const bannerT = interpolate(repealT, [0, 0.35], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const sceneDim = 1 - 0.55 * bannerT;

  // ---- Waves ---------------------------------------------------------------------
  const waves = [200, 320, 440, 560].map((y, i) => (
    <path
      key={i}
      d={`M 320 ${y} q 30 ${-10 + 4 * Math.sin(frame / 20 + i * 1.7)} 60 0 t 60 0 t 60 0 t 60 0 t 60 0`}
      fill="none"
      stroke={alpha(COLOR.skyOnNight, 0.25)}
      strokeWidth={2}
    />
  ));

  return (
    <svg width={width} height={height} style={{display: 'block'}}>
      <g transform={`scale(${u})`} width={1280} height={720}>
      <defs>
        <marker id="bp-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L9,3 L0,6 Z" fill={arrowFlow > 0.5 ? COLOR.goldOnNight : COLOR.redOnNight} />
        </marker>
      </defs>
      <g opacity={sceneDim}>
        {/* Night Atlantic backdrop */}
        <rect width={1280} height={720} fill={COLOR.night} />

        {/* Britain */}
        <g opacity={interpolate(setupT, [0, 0.2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}>
          <rect x={britainX - 80} y={landY} width={160} height={landH} rx={RADIUS.lg}
            fill={COLOR.nightLand} stroke={COLOR.nightCoast} strokeWidth={3} />
          <text x={britainX} y={landY - 28} textAnchor="middle" fill={COLOR.redOnNight}
            fontFamily={FONT.display} fontSize={TYPE.place} letterSpacing={3}>BRITAIN</text>
          {/* London merchant house */}
          <rect x={britainX - 40} y={landY + 90} width={80} height={60} rx={RADIUS.sm}
            fill={alpha(COLOR.british, 0.35)} stroke={COLOR.redOnNight} strokeWidth={2} />
          <text x={britainX} y={landY + 178} textAnchor="middle" fill={COLOR.onNightMuted}
            fontFamily={FONT.ui} fontSize={TYPE.label}>merchant houses</text>
        </g>

        {/* Colonies */}
        <g opacity={interpolate(setupT, [0.1, 0.3], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}>
          <rect x={colonyX - 130} y={landY} width={230} height={landH} rx={RADIUS.lg}
            fill={COLOR.nightLand} stroke={COLOR.nightCoast} strokeWidth={3} />
          <text x={colonyX - 15} y={landY - 28} textAnchor="middle" fill={COLOR.goldOnNight}
            fontFamily={FONT.display} fontSize={TYPE.place} letterSpacing={3}>THE COLONIES</text>
          {PORTS.map((f, i) => (
            <g key={i}>
              <circle cx={colonyX + 100} cy={f * 720} r={9} fill={COLOR.townLive} />
              <text x={colonyX + 118} y={f * 720 + 6} fill={COLOR.onNightMuted}
                fontFamily={FONT.ui} fontSize={TYPE.label}>{['Boston', 'New York', 'Charleston'][i]}</text>
            </g>
          ))}
        </g>

        {/* Ocean waves */}
        {waves}

        {/* Trade-flow arrow */}
        <line x1={arrowX1} y1={300} x2={arrowX2} y2={300}
          stroke={arrowFlow > 0.5 ? COLOR.goldOnNight : COLOR.redOnNight}
          strokeWidth={6} strokeDasharray="22 14" strokeDashoffset={arrowDash}
          opacity={Math.max(0.15, arrowOpacity)} markerEnd="url(#bp-arrow)" />

        {/* Ships */}
        {ships.map(s => (
          <g key={s.i} transform={`translate(${s.x.toFixed(1)},${s.y}) scale(${s.dir},1)`}
            opacity={s.dim}>
            {/* hull */}
            <path d="M -46 0 L 46 0 L 32 20 L -32 20 Z" fill={COLOR.brown} stroke={COLOR.ink} strokeWidth={2} />
            {/* masts + sails */}
            <line x1={-18} y1={0} x2={-18} y2={-52} stroke={COLOR.ink} strokeWidth={3} />
            <line x1={16} y1={0} x2={16} y2={-52} stroke={COLOR.ink} strokeWidth={3} />
            <path d="M -16 -50 q 22 8 0 28 Z" fill={COLOR.paper} opacity={0.95} />
            <path d="M 18 -50 q 22 8 0 28 Z" fill={COLOR.paper} opacity={0.95} />
            {/* cargo crates (only on the outward, loaded run) */}
            {s.loaded && (
              <g>
                <rect x={-34} y={-16} width={16} height={14} fill={COLOR.amber} stroke={COLOR.ink} strokeWidth={1.5} />
                <rect x={-16} y={-16} width={16} height={14} fill={COLOR.amber} stroke={COLOR.ink} strokeWidth={1.5} />
                <rect x={-25} y={-32} width={16} height={14} fill={COLOR.gold} stroke={COLOR.ink} strokeWidth={1.5} />
              </g>
            )}
          </g>
        ))}

        {/* Setup label */}
        <g opacity={interpolate(setupT, [0.4, 0.6], [1, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        })}>
          <text x={640} y={120} textAnchor="middle" fill={COLOR.onNight}
            fontFamily={FONT.text} fontSize={TYPE.caption}>
            British merchants depend on colonial buyers
          </text>
        </g>

        {/* NONIMPORTATION stamp over the ports */}
        {stampScale > 0 && (
          <g transform={`translate(${colonyX + 40},${landY + landH / 2 - 30}) rotate(-12) scale(${stampScale})`}
            opacity={stampOpacity}>
            <rect x={-170} y={-44} width={340} height={88} rx={RADIUS.sm} fill="none"
              stroke={COLOR.redOnNight} strokeWidth={6} />
            <rect x={-160} y={-34} width={320} height={68} rx={RADIUS.sm} fill="none"
              stroke={COLOR.redOnNight} strokeWidth={2} />
            <text x={0} y={12} textAnchor="middle" fill={COLOR.redOnNight}
              fontFamily={FONT.display} fontSize={TYPE.h3} letterSpacing={4}>NONIMPORTATION</text>
          </g>
        )}

        {/* Pain: merchant ledger (parchment) */}
        {ledgerOpacity > 0 && (
          <g opacity={ledgerOpacity}>
            <g transform={`translate(${britainX - 260},${landY + landH + 24})`}>
              <rect x={0} y={0} width={520} height={150} rx={RADIUS.md}
                fill={COLOR.paper} stroke={COLOR.ink} strokeWidth={3}
                style={{filter: 'drop-shadow(0 6px 18px rgba(20,12,4,0.28))'}} />
              <text x={20} y={34} fill={COLOR.ink} fontFamily={FONT.display} fontSize={TYPE.h3}>
                Merchant's Ledger
              </text>
              {/* distressed merchant: furrowed brow + frown + sweat */}
              <g transform="translate(460,42)">
                <circle cx={0} cy={0} r={22} fill={COLOR.skin} stroke={COLOR.ink} strokeWidth={2} />
                <rect x={-34} y={20} width={68} height={44} rx={10} fill={COLOR.british} />
                <line x1={-12} y1={-8} x2={-4} y2={-3} stroke={COLOR.ink} strokeWidth={2.5} />
                <line x1={12} y1={-8} x2={4} y2={-3} stroke={COLOR.ink} strokeWidth={2.5} />
                <circle cx={-8} cy={2} r={2.5} fill={COLOR.ink} />
                <circle cx={8} cy={2} r={2.5} fill={COLOR.ink} />
                <path d="M -9 12 q 9 -6 18 0" fill="none" stroke={COLOR.ink} strokeWidth={2.5} />
                <path d="M 24 -18 q 8 4 4 14 q -6 8 -14 4 q 6 -8 10 -18" fill={alpha(COLOR.skyOnNight, 0.9)} />
              </g>
              <text x={20} y={70} fill={COLOR.inkSoft} fontFamily={FONT.ui} fontSize={TYPE.label}>
                Colonial revenue:
              </text>
              <text x={20} y={108} fill={COLOR.red} fontFamily={FONT.mono} fontSize={TYPE.h2}>
                £{revenue}k
              </text>
              <text x={230} y={70} fill={COLOR.inkSoft} fontFamily={FONT.ui} fontSize={TYPE.label}>
                Unpaid colonial debts:
              </text>
              <text x={230} y={108} fill={COLOR.red} fontFamily={FONT.mono} fontSize={TYPE.h2}>
                £{debts}k
              </text>
              <text x={20} y={136} fill={COLOR.inkMuted} fontFamily={FONT.hand} fontSize={TYPE.label}>
                trade collapsing since the boycott…
              </text>
            </g>
          </g>
        )}

        {/* Petition stack */}
        {petitions.some(p => p > 0) && (
          <g transform={`translate(120,${landY + landH + 30})`}>
            <text x={0} y={-14} fill={COLOR.goldOnNight} fontFamily={FONT.ui} fontSize={TYPE.label}>
              Merchants petition Parliament
            </text>
            {petitions.map((p, i) => p > 0 && (
              <g key={i} opacity={p} transform={`translate(${i * 26},${-i * 7}) rotate(${-4 + i * 2})`}>
                <rect x={0} y={0} width={96} height={70} rx={RADIUS.sm}
                  fill={COLOR.paper} stroke={COLOR.ink} strokeWidth={2} />
                {[0, 1, 2].map(l => (
                  <line key={l} x1={12} y1={16 + l * 14} x2={84} y2={16 + l * 14}
                    stroke={COLOR.inkSoft} strokeWidth={2} />
                ))}
              </g>
            ))}
          </g>
        )}
      </g>

      {/* Repeal banner */}
      {bannerT > 0 && (
        <g opacity={bannerT}>
          <rect x={190} y={230} width={900} height={260} rx={RADIUS.lg}
            fill={alpha(COLOR.nightPanel, 0.94)} stroke={COLOR.gold} strokeWidth={4} />
          <text x={640} y={330} textAnchor="middle" fill={COLOR.goldOnNight}
            fontFamily={FONT.display} fontSize={TYPE.h1}>
            Parliament repeals the Stamp Act, 1766
          </text>
          <text x={640} y={400} textAnchor="middle" fill={COLOR.onNight}
            fontFamily={FONT.text} fontSize={TYPE.body}>
            The boycott worked — economic pressure beat petitions
          </text>
          <text x={640} y={452} textAnchor="middle" fill={COLOR.onNightMuted}
            fontFamily={FONT.ui} fontSize={TYPE.label}>
            Hurt British merchants → merchants pressured Parliament → repeal
          </text>
        </g>
      )}
      </g>
    </svg>
  );
};
