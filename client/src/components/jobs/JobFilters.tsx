import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { categoriesAPI } from '@/lib/api'
import { SlidersHorizontal, ChevronDown, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const JOB_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
]

const EXPERIENCE_OPTIONS = [
  { value: 'all', label: 'All Experience Levels' },
  { value: 'fresher', label: 'Fresher (0–1 yr)' },
  { value: '1-3', label: '1–3 yrs' },
  { value: '3-5', label: '3–5 yrs' },
  { value: '5-10', label: '5–10 yrs' },
  { value: '10+', label: '10+ yrs' },
]

const SALARY_OPTIONS = [
  { value: 'all', label: 'All Salaries' },
  { value: '0-3', label: '0 – 3 LPA' },
  { value: '3-6', label: '3 – 6 LPA' },
  { value: '6-10', label: '6 – 10 LPA' },
  { value: '10+', label: '10+ LPA' },
]

interface JobFiltersProps {
  onFilterChange: (filters: Record<string, unknown>) => void
  className?: string
}

function FilterRadioGroup({
  options,
  selectedValue,
  onChange,
}: {
  options: { value: string; label: string }[]
  selectedValue: string
  onChange: (val: string) => void
}) {
  return (
    <div className="space-y-1.5">
      {options.map(({ value, label }) => {
        const isSelected = selectedValue === value || (!selectedValue && value === 'all')
        return (
          <label
            key={value}
            onClick={() => onChange(value)}
            className="flex items-center gap-2 cursor-pointer group select-none py-0.5"
          >
            <div
              className={cn(
                'w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all shrink-0',
                isSelected
                  ? 'border-blue-600 bg-white ring-2 ring-blue-500/20'
                  : 'border-gray-300 group-hover:border-gray-400 bg-white'
              )}
            >
              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
            </div>
            <span
              className={cn(
                'text-xs transition-colors',
                isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'
              )}
            >
              {label}
            </span>
          </label>
        )
      })}
    </div>
  )
}

export default function JobFilters({ onFilterChange, className }: JobFiltersProps) {
  const [searchParams] = useSearchParams()

  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [jobType, setJobType] = useState(searchParams.get('type') || 'all')
  const [experience, setExperience] = useState(searchParams.get('experience') || 'all')
  const [salary, setSalary] = useState(searchParams.get('salary') || 'all')

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll(),
  })
  const categories = cats?.data?.data || []

  // Sync internal state if URL changes externally
  useEffect(() => {
    setCategory(searchParams.get('category') || '')
    setJobType(searchParams.get('type') || 'all')
    setExperience(searchParams.get('experience') || 'all')
    setSalary(searchParams.get('salary') || 'all')
  }, [searchParams])

  const notifyChange = (newCat: string, newType: string, newExp: string, newSal: string) => {
    const f: Record<string, unknown> = {}
    if (newCat) f.category = newCat
    if (newType && newType !== 'all') f.jobType = newType

    // Experience translation
    if (newExp && newExp !== 'all') {
      if (newExp === 'fresher') {
        f.experienceMin = 0
        f.experienceMax = 1
      } else if (newExp === '1-3') {
        f.experienceMin = 1
        f.experienceMax = 3
      } else if (newExp === '3-5') {
        f.experienceMin = 3
        f.experienceMax = 5
      } else if (newExp === '5-10') {
        f.experienceMin = 5
        f.experienceMax = 10
      } else if (newExp === '10+') {
        f.experienceMin = 10
      }
      f.experience = newExp
    }

    // Salary translation
    if (newSal && newSal !== 'all') {
      if (newSal === '0-3') {
        f.minSalary = 0
        f.maxSalary = 300000
      } else if (newSal === '3-6') {
        f.minSalary = 300000
        f.maxSalary = 600000
      } else if (newSal === '6-10') {
        f.minSalary = 600000
        f.maxSalary = 1000000
      } else if (newSal === '10+') {
        f.minSalary = 1000000
      }
      f.salary = newSal
    }

    onFilterChange(f)
  }

  const handleCategoryChange = (val: string) => {
    setCategory(val)
    notifyChange(val, jobType, experience, salary)
  }

  const handleJobTypeChange = (val: string) => {
    setJobType(val)
    notifyChange(category, val, experience, salary)
  }

  const handleExperienceChange = (val: string) => {
    setExperience(val)
    notifyChange(category, jobType, val, salary)
  }

  const handleSalaryChange = (val: string) => {
    setSalary(val)
    notifyChange(category, jobType, experience, val)
  }

  const handleResetAll = () => {
    setCategory('')
    setJobType('all')
    setExperience('all')
    setSalary('all')
    onFilterChange({})
    toast.success('Filters cleared')
  }

  const handleSaveAlert = () => {
    toast.success('Job alert saved for current filters! You will receive notifications for new openings.')
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-4 space-y-4',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">Filters</span>
        <button
          type="button"
          onClick={handleResetAll}
          className="text-xs text-blue-600 hover:text-blue-700 transition cursor-pointer"
        >
          Reset All
        </button>
      </div>

      {/* Category Dropdown */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Category
        </label>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-lg px-3 py-2 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer pr-8"
          >
            <option value="">All categories</option>
            {categories.map((c: any) => (
              <option key={c.id || c._id} value={c.slug || c.name || c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Job Type */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Job Type
        </label>
        <FilterRadioGroup
          options={JOB_TYPE_OPTIONS}
          selectedValue={jobType}
          onChange={handleJobTypeChange}
        />
      </div>

      {/* Experience */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Experience
        </label>
        <FilterRadioGroup
          options={EXPERIENCE_OPTIONS}
          selectedValue={experience}
          onChange={handleExperienceChange}
        />
      </div>

      {/* Salary */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Salary (Per Annum)
        </label>
        <FilterRadioGroup
          options={SALARY_OPTIONS}
          selectedValue={salary}
          onChange={handleSalaryChange}
        />
      </div>

      {/* Save Alert */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleSaveAlert}
          className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg py-2 px-3 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Save Search & Alert</span>
        </button>
      </div>
    </div>
  )
}
