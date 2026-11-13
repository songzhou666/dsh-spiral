/** Inline glyphs: one visual language, no icon-font dependency. */

export interface GlyphProps {
  readonly size?: number
  readonly className?: string
}

function Glyph({ size = 16, className, children }: GlyphProps & { children: React.ReactNode }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function NebulaGlyph(props: GlyphProps): React.ReactElement {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(-28 12 12)" opacity="0.75" />
      <ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(38 12 12)" opacity="0.45" />
      <circle cx="19.2" cy="7.6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="5.4" cy="16.8" r="0.9" fill="currentColor" stroke="none" opacity="0.7" />
    </Glyph>
  )
}

export function IconPower(props: GlyphProps): React.ReactElement {
  return (
    <Glyph {...props}>
      <path d="M12 3v8" />
      <path d="M6.4 6.6a8 8 0 1 0 11.2 0" />
    </Glyph>
  )
}

export function IconPlay(props: GlyphProps): React.ReactElement {
  return (
    <Glyph {...props}>
      <path d="M9 6.5 17.5 12 9 17.5Z" />
    </Glyph>
  )
}

export function IconStop(props: GlyphProps): React.ReactElement {
  return (
    <Glyph {...props}>
      <rect x="7.5" y="7.5" width="9" height="9" rx="1.4" />
    </Glyph>
  )
}

export function IconPalette(props: GlyphProps): React.ReactElement {
  return (
    <Glyph {...props}>
      <path d="M12 3.2a8.8 8.8 0 1 0 0 17.6c1.5 0 2.2-.9 2.2-1.9 0-.8-.4-1.2-.4-1.9 0-.9.7-1.6 1.8-1.6h1.6c2 0 3.6-1.6 3.6-3.7C20.8 6.5 16.9 3.2 12 3.2Z" />
      <circle cx="8.2" cy="9.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.4" cy="7.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.2" cy="9.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="7.8" cy="13.8" r="1" fill="currentColor" stroke="none" />
    </Glyph>
  )
}

export function IconSliders(props: GlyphProps): React.ReactElement {
  return (
    <Glyph {...props}>
      <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h9M17 17h3" />
      <circle cx="15" cy="7" r="1.8" />
      <circle cx="9" cy="12" r="1.8" />
      <circle cx="15" cy="17" r="1.8" />
    </Glyph>
  )
}

export function IconChevron(props: GlyphProps): React.ReactElement {
  return (
    <Glyph {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </Glyph>
  )
}

export function IconTrash(props: GlyphProps): React.ReactElement {
  return (
    <Glyph {...props}>
      <path d="M4 7h16M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7M7 7l.8 11.2c.1 1 .9 1.8 1.9 1.8h4.6c1 0 1.8-.8 1.9-1.8L17 7" />
    </Glyph>
  )
}

export function IconMoon(props: GlyphProps): React.ReactElement {
  return (
    <Glyph {...props}>
      <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z" />
    </Glyph>
  )
}

export function IconCollapse(props: GlyphProps): React.ReactElement {
  return (
    <Glyph {...props}>
      <path d="M4 5v14M20 5v14M14 8l-4 4 4 4" />
    </Glyph>
  )
}

export function IconSpark(props: GlyphProps): React.ReactElement {
  return (
    <Glyph {...props}>
      <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9Z" />
      <path d="M18.5 16.2 19.2 18l1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" opacity="0.7" />
    </Glyph>
  )
}

export function IconExport(props: GlyphProps): React.ReactElement {
  return (
    <Glyph {...props}>
      <path d="M12 3.5v10M8.5 10 12 13.5 15.5 10" />
      <path d="M4.5 15.5v2.8c0 .7.5 1.2 1.2 1.2h12.6c.7 0 1.2-.5 1.2-1.2v-2.8" />
    </Glyph>
  )
}

export function IconWave(props: GlyphProps): React.ReactElement {
  return (
    <Glyph {...props}>
      <path d="M3 12h2.2l1.6-5.4 2.6 11 2.2-7.4 1.8 4.6 1.4-2.8H21" />
    </Glyph>
  )
}
