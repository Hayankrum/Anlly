interface HeroMinimalProps {
  children: React.ReactNode
  logoSrc?: string
  className?: string
}

export default function HeroMinimal({ children, logoSrc = '/icons/icon.svg', className }: HeroMinimalProps) {
  return (
    <section
      className={`relative overflow-hidden min-h-[60vh] md:min-h-[70vh] flex items-center md:items-center ${className ?? ''}`}
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Watermark logo */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          className="w-[50vw] h-auto md:w-[40vw] max-w-[420px] min-w-[180px]"
          style={{ opacity: 'var(--watermark-opacity, 0.06)' }}
        />
      </div>

      {/* Foreground content */}
      <div className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-20 pb-16 md:pt-0 md:pb-0 md:flex md:flex-col md:items-center md:text-center">
        {children}
      </div>
    </section>
  )
}
