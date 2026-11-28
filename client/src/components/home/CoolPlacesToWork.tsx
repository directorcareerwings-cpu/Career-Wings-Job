import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { publicAPI } from '@/lib/api'

interface CoolPlaceLogo {
  id: string
  name: string
  logoUrl: string
  website?: string
  displayOrder: number
}

const BRAND_LOGO_MATCHERS: Array<[RegExp, string]> = [
  [/axis/, '/images/brands/axis-bank.png'],
  [/mahindra|mhindra/, '/images/brands/tech-mahindra.png'],
  [/future|generali|generli/, '/images/brands/future-generali.png'],
  [/iifl|infoline/, '/images/brands/iifl.png'],
  [/wipro/, '/images/brands/wipro.png'],
  [/tcs|tata\s*consultancy/, '/images/brands/tcs.png'],
  [/hcl/, '/images/brands/hcl.png'],
  [/hdfc/, '/images/brands/hdfc.png'],
  [/infosys/, '/images/brands/infosys.png'],
  [/capgemini/, '/images/brands/capgemini.png'],
  [/kotak/, '/images/brands/kotak.png'],
  [/ntt/, '/images/brands/ntt-data.png'],
  [/lti|mindtree/, '/images/brands/ltimindtree.png'],
  [/oil\s*india/, '/images/brands/oil-india.png'],
]

function resolveBrandLogoFallback(name?: string): string | null {
  const norm = (name || '').toLowerCase().trim()
  if (!norm) return null
  const hit = BRAND_LOGO_MATCHERS.find(([regex]) => regex.test(norm))
  return hit ? hit[1] : null
}

const FALLBACK_LOGOS: CoolPlaceLogo[] = [
  { id: '1', name: 'TCS', logoUrl: '/images/brands/tcs.png', website: 'https://www.tcs.com/careers', displayOrder: 1 },
  { id: '2', name: 'Wipro', logoUrl: '/images/brands/wipro.png', website: 'https://careers.wipro.com', displayOrder: 2 },
  { id: '3', name: 'Infosys', logoUrl: '/images/brands/infosys.png', website: 'https://www.infosys.com/careers', displayOrder: 3 },
  { id: '4', name: 'Capgemini', logoUrl: '/images/brands/capgemini.png', website: 'https://www.capgemini.com/in-en/careers', displayOrder: 4 },
  { id: '5', name: 'HCL', logoUrl: '/images/brands/hcl.png', website: 'https://www.hcltech.com/careers', displayOrder: 5 },
  { id: '6', name: 'Kotak', logoUrl: '/images/brands/kotak.png', website: 'https://www.kotak.com/en/general/careers.html', displayOrder: 6 },
  { id: '7', name: 'NTT Data', logoUrl: '/images/brands/ntt-data.png', website: 'https://in.nttdata.com/en/careers', displayOrder: 7 },
  { id: '8', name: 'LTIMindtree', logoUrl: '/images/brands/ltimindtree.png', website: 'https://www.ltimindtree.com/careers', displayOrder: 8 },
  { id: '9', name: 'Oil India', logoUrl: '/images/brands/oil-india.png', website: 'https://www.oil-india.com/careers', displayOrder: 9 },
  { id: '10', name: 'HDFC Bank', logoUrl: '/images/brands/hdfc.png', website: 'https://www.hdfcbank.com', displayOrder: 10 },
]

function LogoCard({ logo }: { logo: CoolPlaceLogo }) {
  const brandFallback = resolveBrandLogoFallback(logo.name)
  const [src, setSrc] = useState(logo.logoUrl || brandFallback || '')
  const [failed, setFailed] = useState(!logo.logoUrl && !brandFallback)

  useEffect(() => {
    setSrc(logo.logoUrl || brandFallback || '')
    setFailed(!logo.logoUrl && !brandFallback)
  }, [logo.logoUrl, brandFallback])

  const handleImgError = () => {
    if (brandFallback && src !== brandFallback) {
      setSrc(brandFallback)
    } else {
      setFailed(true)
    }
  }

  const card = (
    <div className="group flex items-center justify-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all duration-300 w-[184px] h-[84px] sm:w-[196px] sm:h-[88px] px-5 py-3.5 shrink-0">
      <div className="w-[136px] h-[44px] sm:w-[144px] sm:h-[46px] flex items-center justify-center overflow-hidden">
        {!failed && src ? (
          <img
            src={src}
            alt={logo.name}
            onError={handleImgError}
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 select-none"
          />
        ) : (
          <span className="text-xs sm:text-sm font-bold text-slate-700 text-center line-clamp-2 leading-tight">
            {logo.name}
          </span>
        )}
      </div>
    </div>
  )
  if (logo.website) {
    return <a href={logo.website} target="_blank" rel="noopener noreferrer" aria-label={logo.name + ' careers'}>{card}</a>
  }
  return card
}

export default function CoolPlacesToWork() {
  const { data } = useQuery({
    queryKey: ['cool-places-public'],
    queryFn: () => publicAPI.getCoolPlaces().then((r) => r.data?.data || []),
    staleTime: 5 * 60 * 1000,
  })

  const logos: CoolPlaceLogo[] = data && data.length > 0 ? data : FALLBACK_LOGOS
  const track = [...logos, ...logos, ...logos]

  return (
    <section className="py-12 bg-white border-b border-slate-100 overflow-hidden">
      <div className="flex items-center justify-center gap-4 mb-8 px-4">
        <div className="flex-1 max-w-[100px] h-px bg-slate-200" />
        <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 sm:px-5 py-2 shadow-2xs shrink-0">
          <span className="text-slate-400 text-base">&#8592;</span>
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.16em] uppercase text-slate-700">Cool Places to Work</span>
          <span className="text-slate-400 text-base">&#8594;</span>
        </div>
        <div className="flex-1 max-w-[100px] h-px bg-slate-200" />
      </div>
      <div className="relative w-full">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-20 z-10 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-20 z-10 bg-gradient-to-l from-white to-transparent" />
        <div
          className="flex gap-4 px-4"
          style={{ width: 'max-content', animation: 'coolMarquee 18s linear infinite' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = 'paused')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = 'running')}
        >
          {track.map((logo, idx) => (
            <LogoCard key={logo.id + '-' + idx} logo={logo} />
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-slate-400 mt-6 px-4">
        Top companies actively hiring across Northeast India
      </p>
    </section>
  )
}
