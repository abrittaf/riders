import { useId } from 'react'
import type {
  AvatarOptions,
  HelmetColor,
  NeckwearColor,
} from './avatar-options.ts'

/**
 * El avatar dibujado como capas SVG a partir de sus opciones (design.md de rider-onboarding, D5),
 * siguiendo `docs/rider-avatars-no-background.png`. `profile` es el tamaño del perfil; `marker`,
 * el del marcador sobre el mapa: redondo, con borde para que se lea sobre cualquier fondo.
 */
export type AvatarVariant = 'profile' | 'marker'

const SIZE_IN_PX: Record<AvatarVariant, number> = { profile: 96, marker: 40 }

const HELMET_FILL: Record<HelmetColor, string> = {
  white: '#f4f4f4',
  black: '#262626',
  gray: '#7d7d7d',
}

const HELMET_STROKE: Record<HelmetColor, string> = {
  white: '#9a9a9a',
  black: '#0d0d0d',
  gray: '#4f4f4f',
}

const NECKWEAR_FILL: Record<NeckwearColor, string> = {
  blue: '#1e63c9',
  green: '#2e9e4f',
  red: '#d93025',
  orange: '#f07f1b',
  yellow: '#f5c21b',
  'light-blue': '#3fb0e8',
}

const SKIN = '#e8b592'
const JACKET = '#3a3f47'
const INK = '#222222'
const BEARD = '#2b1d12'

export function Avatar({
  options,
  variant = 'profile',
  label,
}: {
  options: AvatarOptions
  variant?: AvatarVariant
  /** Texto accesible; sin él, el avatar es decorativo (el nombre va al lado). */
  label?: string
}) {
  const id = useId()
  const clipId = `avatar-clip-${id}`
  const checkersId = `avatar-checkers-${id}`
  const size = SIZE_IN_PX[variant]

  return (
    <svg
      className={`avatar avatar-${variant}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-helmet-type={options.helmetType}
      data-helmet-color={options.helmetColor}
      data-neckwear={options.neckwear}
      data-neckwear-color={
        options.neckwear === 'checkered-flag' ? 'none' : options.neckwearColor
      }
      data-glasses={options.glasses}
      data-beard={options.beard}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
        <pattern
          id={checkersId}
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <rect width="10" height="10" fill="#f4f4f4" />
          <rect width="5" height="5" fill="#111111" />
          <rect x="5" y="5" width="5" height="5" fill="#111111" />
        </pattern>
      </defs>
      {variant === 'marker' && (
        <circle cx="50" cy="50" r="49" fill="#ffffff" stroke="#14213d" />
      )}
      <g clipPath={variant === 'marker' ? `url(#${clipId})` : undefined}>
        <Shoulders />
        <Neckwear options={options} checkersId={checkersId} />
        <Face options={options} />
        <Helmet options={options} />
      </g>
    </svg>
  )
}

function Shoulders() {
  return (
    <>
      <path d="M 12 100 Q 12 84 34 82 L 66 82 Q 88 84 88 100 Z" fill={JACKET} />
      <rect x="40" y="70" width="20" height="16" fill={SKIN} />
    </>
  )
}

function Neckwear({
  options,
  checkersId,
}: {
  options: AvatarOptions
  checkersId: string
}) {
  const fill =
    options.neckwear === 'checkered-flag'
      ? `url(#${checkersId})`
      : NECKWEAR_FILL[options.neckwearColor]

  switch (options.neckwear) {
    case 'bandana':
    case 'checkered-flag':
      return (
        <g data-layer="neckwear">
          <path d="M 28 82 L 72 82 L 50 100 Z" fill={fill} />
          <path
            d="M 28 82 L 72 82 L 70 88 L 30 88 Z"
            fill={fill}
            stroke="#00000033"
          />
        </g>
      )
    case 'buff':
      return (
        <g data-layer="neckwear">
          <rect x="28" y="76" width="44" height="22" rx="8" fill={fill} />
          <path d="M 32 84 Q 50 90 68 84" stroke="#00000033" fill="none" />
        </g>
      )
    case 'tube':
      return (
        <g data-layer="neckwear">
          <rect x="31" y="82" width="38" height="14" rx="3" fill={fill} />
          <line x1="31" y1="89" x2="69" y2="89" stroke="#00000033" />
        </g>
      )
  }
}

function Face({ options }: { options: AvatarOptions }) {
  return (
    <g data-layer="face">
      <circle cx="50" cy="52" r="23" fill={SKIN} />
      {options.beard && (
        <path
          d="M 32 56 Q 50 74 68 56 L 68 66 L 32 66 Z"
          fill={BEARD}
          data-layer="beard"
        />
      )}
      <path
        d="M 35 44 Q 41 41 47 44"
        stroke={INK}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M 53 44 Q 59 41 65 44"
        stroke={INK}
        strokeWidth="1.5"
        fill="none"
      />
      <ellipse cx="41" cy="50" rx="2.6" ry="3.2" fill={INK} />
      <ellipse cx="59" cy="50" rx="2.6" ry="3.2" fill={INK} />
      {options.glasses && (
        <g data-layer="glasses" stroke={INK} strokeWidth="2" fill="none">
          <circle cx="41" cy="50" r="6.5" fill="#1f2a3a" fillOpacity="0.55" />
          <circle cx="59" cy="50" r="6.5" fill="#1f2a3a" fillOpacity="0.55" />
          <line x1="47.5" y1="50" x2="52.5" y2="50" />
        </g>
      )}
    </g>
  )
}

function Helmet({ options }: { options: AvatarOptions }) {
  const fill = HELMET_FILL[options.helmetColor]
  const stroke = HELMET_STROKE[options.helmetColor]
  // El casco se dibuja con un hueco por el que se ve la cara: cúpula más mentonera, menos la abertura.
  const shell =
    'M 18 56 A 32 32 0 1 1 82 56 L 82 72 Q 82 82 72 82 L 28 82 Q 18 82 18 72 Z ' +
    'M 28 40 Q 28 36 32 36 L 68 36 Q 72 36 72 40 L 72 60 Q 72 64 68 64 L 32 64 Q 28 64 28 60 Z'

  return (
    <g data-layer="helmet">
      <path
        d={shell}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        fillRule="evenodd"
      />
      {options.helmetType === 'full-face' ? (
        <rect
          x="28"
          y="36"
          width="44"
          height="28"
          rx="4"
          fill="#9bd6f5"
          fillOpacity="0.3"
          stroke={stroke}
          strokeOpacity="0.6"
          data-layer="visor"
        />
      ) : (
        <g data-layer="modular">
          <path
            d="M 24 30 Q 50 20 76 30 L 76 36 Q 50 28 24 36 Z"
            fill="#9bd6f5"
            fillOpacity="0.6"
            stroke={stroke}
          />
          <line
            x1="18"
            y1="66"
            x2="82"
            y2="66"
            stroke={stroke}
            strokeWidth="1.5"
          />
          <circle cx="23" cy="62" r="2.5" fill={stroke} />
          <circle cx="77" cy="62" r="2.5" fill={stroke} />
        </g>
      )}
    </g>
  )
}
