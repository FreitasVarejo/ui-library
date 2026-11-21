import { useState } from "react"
import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import { Icons } from "@/lib/icons"

import { formatDuration, formatRelative, toMillis } from "./format"
import { LogViewer } from "./log-viewer"
import type { Job, JobStatus, JobsPanelLabels } from "./types"

const STATUS_ICON: Record<JobStatus, ReactNode> = {
  queued: <Icons.clock />,
  running: <Icons.loading className="motion-safe:animate-spin" />,
  succeeded: <Icons.success />,
  failed: <Icons.error />,
  cancelled: <Icons.stop />,
}

const STATUS_VARIANT: Record<
  JobStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  queued: "outline",
  running: "default",
  succeeded: "secondary",
  failed: "destructive",
  cancelled: "outline",
}

function timeLine(job: Job, labels: JobsPanelLabels, now: number) {
  const queued = toMillis(job.queuedAt)
  const started = toMillis(job.startedAt)
  const finished = toMillis(job.finishedAt)
  const iso = (millis: number) => new Date(millis).toISOString()

  if (job.status === "queued" && queued !== undefined)
    return {
      iso: iso(queued),
      text: labels.queuedSince(formatRelative(queued, now)),
    }
  if (job.status === "running" && started !== undefined)
    return {
      iso: iso(started),
      text: labels.startedSince(formatRelative(started, now)),
    }
  if (finished !== undefined) {
    const from = started ?? queued
    return {
      iso: iso(finished),
      text: labels.finishedSince(
        formatRelative(finished, now),
        from === undefined ? "—" : formatDuration(finished - from)
      ),
    }
  }
  return undefined
}

export interface JobRowProps {
  job: Job
  labels: JobsPanelLabels
  now: number
  onRetry?: (job: Job) => void
  onCancel?: (job: Job) => void
}

export function JobRow({ job, labels, now, onRetry, onCancel }: JobRowProps) {
  const [open, setOpen] = useState(false)
  const time = timeLine(job, labels, now)
  const log = Array.isArray(job.log) ? job.log.join("\n") : (job.log ?? "")
  const canCancel =
    onCancel && (job.status === "queued" || job.status === "running")
  const canRetry =
    onRetry && (job.status === "failed" || job.status === "cancelled")

  return (
    <li
      data-slot="job-row"
      data-status={job.status}
      className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 text-sm font-medium break-words">
              {job.name}
            </span>
            <Badge variant={STATUS_VARIANT[job.status]}>
              {STATUS_ICON[job.status]}
              {labels.statuses[job.status]}
            </Badge>
          </div>
          {job.description ? (
            <p className="text-xs text-muted-foreground">{job.description}</p>
          ) : null}
          {time ? (
            <time dateTime={time.iso} className="text-xs text-muted-foreground">
              {time.text}
            </time>
          ) : null}
          {job.status === "failed" && job.error ? (
            <p className="text-xs break-words text-destructive">{job.error}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {canRetry ? (
            <Button
              variant="outline"
              size="sm"
              aria-label={labels.retryAria(job.name)}
              onClick={() => onRetry(job)}
            >
              <Icons.retry data-icon="inline-start" />
              {labels.retry}
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              variant="outline"
              size="sm"
              aria-label={labels.cancelAria(job.name)}
              onClick={() => onCancel(job)}
            >
              <Icons.stop data-icon="inline-start" />
              {labels.cancel}
            </Button>
          ) : null}
        </div>
      </div>

      {job.status === "running" ? (
        <Progress
          value={job.progress === undefined ? null : job.progress}
          aria-label={labels.progressAria(job.name)}
        />
      ) : null}

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={<Button variant="ghost" size="xs" className="-ml-1" />}
        >
          <Icons.terminal data-icon="inline-start" />
          {open ? labels.hideLog : labels.showLog}
          <Icons.chevronDown
            data-icon="inline-end"
            className={open ? "rotate-180" : undefined}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <LogViewer text={log} name={job.name} labels={labels} />
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}
