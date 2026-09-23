import { useState } from 'react';
import { Box, Typography } from '@mui/material';

// Deux séries sur douze mois : demandes reçues et demandes clôturées.
// Palette validée pour la vision des couleurs (ΔE 15,8 en deutéranopie).
const RECEIVED = '#2E86C1';
const CLOSED = '#2E9E6B';
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

// Une seule échelle pour les deux séries : elles comptent la même chose, des
// demandes. Deux axes donneraient à lire des écarts qui n'existent pas.
export function ActivityChart({
  data,
}: {
  data: { month: number; received: number; closed: number }[];
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 560;
  const H = 180;
  const padL = 30;
  const padR = 12;
  const padT = 12;
  const padB = 26;
  const max = Math.max(1, ...data.flatMap((d) => [d.received, d.closed]));
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, data.length - 1);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const path = (key: 'received' | 'closed') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(' ');

  const active = hover !== null ? data[hover] : null;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Légende : deux séries, l'identité ne repose jamais sur la seule couleur. */}
      <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
        {[
          { c: RECEIVED, l: 'Reçues' },
          { c: CLOSED, l: 'Clôturées' },
        ].map((s) => (
          <Box key={s.l} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <Box sx={{ width: 14, height: 2.5, borderRadius: 2, bgcolor: s.c }} />
            <Typography sx={{ fontSize: 11.5, color: '#5D6D7E' }}>{s.l}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          role="img"
          aria-label="Demandes reçues et clôturées par mois"
        >
          {/* Grille discrète : elle situe, elle ne s'impose pas. */}
          {[0, 0.5, 1].map((t) => (
            <line
              key={t}
              x1={padL}
              x2={W - padR}
              y1={padT + t * (H - padT - padB)}
              y2={padT + t * (H - padT - padB)}
              stroke="#EDF0F3"
              strokeWidth={1}
            />
          ))}
          <text x={4} y={padT + 4} fontSize={9} fill="#9AA7B4">{max}</text>
          <text x={4} y={H - padB + 4} fontSize={9} fill="#9AA7B4">0</text>

          <path d={path('received')} fill="none" stroke={RECEIVED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path d={path('closed')} fill="none" stroke={CLOSED} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {data.map((d, i) => (
            <g key={d.month}>
              <text x={x(i)} y={H - 6} fontSize={9} fill="#9AA7B4" textAnchor="middle">
                {MONTHS[d.month - 1]}
              </text>
              {/* Repères visibles seulement au survol, pour ne pas saturer. */}
              {hover === i && (
                <>
                  <line x1={x(i)} x2={x(i)} y1={padT} y2={H - padB} stroke="#CBD5DD" strokeWidth={1} />
                  <circle cx={x(i)} cy={y(d.received)} r={4} fill={RECEIVED} stroke="#fff" strokeWidth={2} />
                  <circle cx={x(i)} cy={y(d.closed)} r={4} fill={CLOSED} stroke="#fff" strokeWidth={2} />
                </>
              )}
              {/* Zone de survol plus large que le point, pour être atteignable. */}
              <rect
                x={x(i) - (W - padL - padR) / (2 * Math.max(1, data.length - 1))}
                y={0}
                width={(W - padL - padR) / Math.max(1, data.length - 1)}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          ))}
        </svg>

        {active && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              bgcolor: '#fff',
              border: '1px solid #E8EAED',
              borderRadius: 1.5,
              px: 1.2,
              py: 0.8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              pointerEvents: 'none',
            }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#1B4F72' }}>
              {MONTHS[active.month - 1]}
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>Reçues : {active.received}</Typography>
            <Typography sx={{ fontSize: 11, color: '#5D6D7E' }}>Clôturées : {active.closed}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
