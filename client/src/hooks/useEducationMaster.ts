import { useState, useEffect } from 'react'
import { publicAPI } from '@/lib/api'

export const DEFAULT_EDUCATION_LEVELS: string[] = [
  '10th / HSLC',
  '12th / Higher Secondary',
  'Diploma / Polytechnic',
  'Bachelor Degree',
  'Master Degree',
  'Post Graduate Diploma',
  'Doctorate / Ph.D',
  'Any qualification',
]

export const DEFAULT_HIGHEST_DEGREES: string[] = [
  'B.A',
  'B.Com',
  'B.Sc',
  'B.Tech',
  'B.E',
  'BBA',
  'BCA',
  'B.Ed',
  'B.Pharm',
  'M.A',
  'M.Com',
  'M.Sc',
  'M.Tech',
  'MBA',
  'MCA',
  'M.Ed',
  'M.Pharm',
  'MBBS',
  'BDS',
  'BAMS',
  'BHMS',
  'Nursing (B.Sc / GNM)',
  'LLB',
  'LLM',
  'Diploma / Polytechnic',
  'ITI',
  'Ph.D / Doctorate',
  'CA / CS / ICWA',
]

let cachedMasterData: { educationLevels: string[]; highestDegrees: string[] } | null = null

export function useEducationMaster() {
  const [educationLevels, setEducationLevels] = useState<string[]>(
    cachedMasterData?.educationLevels || DEFAULT_EDUCATION_LEVELS
  )
  const [highestDegrees, setHighestDegrees] = useState<string[]>(
    cachedMasterData?.highestDegrees || DEFAULT_HIGHEST_DEGREES
  )
  const [loading, setLoading] = useState(!cachedMasterData)

  useEffect(() => {
    let isMounted = true

    publicAPI
      .getEducationMaster()
      .then((res) => {
        if (!isMounted) return
        const data = res.data?.data || {}
        const levels = Array.isArray(data.educationLevels) && data.educationLevels.length > 0
          ? data.educationLevels
          : DEFAULT_EDUCATION_LEVELS
        const degrees = Array.isArray(data.highestDegrees) && data.highestDegrees.length > 0
          ? data.highestDegrees
          : DEFAULT_HIGHEST_DEGREES

        cachedMasterData = { educationLevels: levels, highestDegrees: degrees }
        setEducationLevels(levels)
        setHighestDegrees(degrees)
      })
      .catch((err) => {
        console.warn('Notice loading education master data:', err?.message)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { educationLevels, highestDegrees, loading }
}
