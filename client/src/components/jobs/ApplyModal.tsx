import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { jobsAPI, candidateAPI } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { FileUpload } from '@/components/ui/FileUpload'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { CompanyAvatar } from '@/components/ui/Avatar'
import { formatJobType, formatWorkMode } from '@/lib/utils'
import type { Job } from '@/types'
import toast from 'react-hot-toast'
import { Briefcase, MapPin, AlertCircle } from 'lucide-react'

const schema = z.object({
  coverLetter: z.string().max(2000, 'Max 2000 characters').optional(),
})
type FormData = z.infer<typeof schema>

interface ApplyModalProps {
  job: Job | null
  open: boolean
  onClose: () => void
}

export default function ApplyModal({ job, open, onClose }: ApplyModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  const { data: profileData } = useQuery({
    queryKey: ['candidate-profile'],
    queryFn: () => candidateAPI.getProfile(),
    enabled: open,
  })

  const { data: subData } = useQuery({
    queryKey: ['candidate-subscription'],
    queryFn: () => candidateAPI.getSubscription(),
    enabled: open,
  })

  const profile = profileData?.data?.data
  const subscription = subData?.data?.data
  const used = subscription?.usage?.jobApplications ?? 0
  const rawLimit = subscription?.limits?.jobApplications ?? subscription?.package?.limits?.jobApplications ?? 15
  const limit = typeof rawLimit === 'number' ? rawLimit : parseInt(String(rawLimit || '15'), 10)
  const isUnlimited = limit === -1
  const hasQuota = isUnlimited || used < limit
  const remaining = isUnlimited ? null : Math.max(0, limit - used)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const applyMutation = useMutation({
    mutationFn: (data: FormData) => {
      const fd = new FormData()
      if (data.coverLetter) fd.append('coverLetter', data.coverLetter)
      const jobId = (job?.id || job?._id || '') as string
      return jobsAPI.apply(jobId, fd)
    },
    onSuccess: () => {
      toast.success('Application submitted successfully!')
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['candidate-subscription'] })
      reset()
      setResumeFile(null)
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to apply. Please try again.')
    },
  })

  if (!job) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Apply for this Position</DialogTitle>
          <DialogDescription>Submit your application to {job.company?.name}</DialogDescription>
        </DialogHeader>

        {/* Job info */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
          <CompanyAvatar logo={job.company?.logo} name={job.company?.name || ''} size="sm" />
          <div>
            <p className="font-semibold text-sm text-gray-900">{job.title}</p>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <span>{job.company?.name}</span>
              <span>·</span>
              <MapPin className="h-3 w-3" />
              <span>
                {typeof job.location === 'object' && job.location !== null
                  ? ((job.location as any).city ? `${(job.location as any).city}${(job.location as any).state ? ', ' + (job.location as any).state : ''}` : (job.location as any).name || (job as any).city || 'Guwahati, Assam')
                  : (typeof job.location === 'string' && job.location ? job.location : (job as any).city ? `${(job as any).city}${(job as any).state ? ', ' + (job as any).state : ''}` : job.locationText || 'Guwahati, Assam')}
              </span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => applyMutation.mutate(d))} className="px-6 py-4 space-y-4">
          {/* Quota warning */}
          {!hasQuota ? (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm bg-amber-50 text-amber-900 border border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block">Your application limit has been reached.</span>
                <span className="text-xs text-amber-800 mt-0.5 block">
                  You have used all {limit} applications in your current package. Upgrade your package to apply for more jobs.
                </span>
              </div>
            </div>
          ) : remaining !== null && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-blue-50 text-blue-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {remaining} application{remaining !== 1 ? 's' : ''} remaining in your plan ({used} / {limit} used)
              </span>
            </div>
          )}

          {/* Cover Letter */}
          <Textarea
            label="Cover Letter (Optional)"
            placeholder="Tell the employer why you're a great fit for this role..."
            rows={5}
            {...register('coverLetter')}
            error={errors.coverLetter?.message}
          />

          {/* Resume */}
          <div>
            {profile?.resumeUrl && !resumeFile ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Resume</label>
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      {profile.resumeFileName || 'Uploaded Resume'}
                    </p>
                    <p className="text-xs text-green-600">This resume will be submitted</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResumeFile(null)}
                    className="text-xs text-green-700 underline"
                  >
                    Replace
                  </button>
                </div>
              </div>
            ) : (
              <FileUpload
                label="Upload Resume"
                hint="PDF, DOC, DOCX — Max 5MB"
                onFileAccepted={setResumeFile}
                currentFileName={resumeFile?.name}
                onRemove={() => setResumeFile(null)}
              />
            )}
          </div>

          <DialogFooter className="px-0 border-0 pb-0">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {!hasQuota ? (
              <Button
                type="button"
                variant="primary"
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => {
                  onClose()
                  navigate('/subscription')
                }}
              >
                Upgrade Package
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                loading={applyMutation.isPending}
              >
                Submit Application
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
