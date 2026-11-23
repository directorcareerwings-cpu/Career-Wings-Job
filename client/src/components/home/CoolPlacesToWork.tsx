import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { publicAPI } from '@/lib/api'

interface CoolPlaceLogo {
  id: string
  name: string
  logoUrl: string
  website?: string
  displayOrder: number
}

const FALLBACK_LOGOS: CoolPlaceLogo[] = [
  { id: '1', name: 'TCS', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Tata_Consultancy_Services_Logo.svg', website: 'https://www.tcs.com/careers', displayOrder: 1 },
  { id: '2', name: 'Wipro', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Wipro_Primary_Logo_Color_RGB.svg', website: 'https://careers.wipro.com', displayOrder: 2 },
  { id: '3', name: 'Infosys', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Infosys_logo.svg', website: 'https://www.infosys.com/careers', displayOrder: 3 },
  { id: '4', name: 'Capgemini', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Cap_gemini_Logo_2COL_RGB.svg', website: 'https://www.capgemini.com/in-en/careers', displayOrder: 4 },
  { id: '5', name: 'HCL', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/HCL_Technologies_logo.svg', website: 'https://www.hcltech.com/careers', displayOrder: 5 },
  { id: '6', name: 'Kotak', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Kotak_Mahindra_Bank_logo.svg', website: 'https://www.kotak.com/en/general/careers.html', displayOrder: 6 },
  { id: '7', name: 'NTT Data', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/NTT_DATA_Logo.svg', website: 'https://in.nttdata.com/en/careers', displayOrder: 7 },
  { id: '8', name: 'LTIMindtree', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/LTIMindtree_Logo.svg/1200px-LTIMindtree_Logo.svg.png', website: 'https://www.ltimindtree.com/careers', displayOrder: 8 },
  { id: '9', name: 'Oil India', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Oil_India_Limited_logo.png', website: 'https://www.oil-india.com/careers', displayOrder: 9 },
  { id: '10', name: 'HDFC Bank', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/28/HDFC_Bank_Logo.svg', website: 'https://www.hdfcbank.com', displayOrder: 10 },
]

function LogoCard({ logo }: { logo: CoolPlaceLogo }) {
  const card = (
    <div className="group flex items-center justify-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all duration-300 px-7 py-5 min-w-[170px] h-[80px]">
      <img
        src={logo.logoUrl}
        alt={logo.name}
        className="max-h-9 max-w-[130px] w-auto object-contain transition-all duration-300 group-hover:scale-105"
        onError={(e) => {
          const t = e.currentTarget as HTMLImageElement
          t.style.display = 'none'
          const p = t.parentElement
          if (p && !p.querySelector('span')) {
            const s = document.createElement('span')
            s.className = 'text-sm font-bold text-gray-500'
            s.textContent = logo.name
            p.appendChild(s)
          }
        }}
      />
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
