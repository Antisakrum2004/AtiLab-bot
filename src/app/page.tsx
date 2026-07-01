'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Clock,
  Send,
  Save,
  Loader2,
  Bell,
  FileText,
  BarChart3,
  Settings2,
  Eye,
  Users,
  User,
  CheckCircle2,
  XCircle,
  ExternalLink,
  History,
} from 'lucide-react'

interface Settings {
  reminder1Time: string
  reminder2Time: string
  reportTime: string
  enabledDays: number[]
}

interface WorkflowRun {
  id: number
  status: string
  conclusion: string | null
  createdAt: string
  htmlUrl: string
  displayTitle: string
}

const DAY_LABELS: Record<number, string> = {
  1: 'Пн',
  2: 'Вт',
  3: 'Ср',
  4: 'Чт',
  5: 'Пт',
  6: 'Сб',
  0: 'Вс',
}

const DEFAULT_SETTINGS: Settings = {
  reminder1Time: '18:00',
  reminder2Time: '19:00',
  reportTime: '20:00',
  enabledDays: [1, 2, 3, 4, 5],
}

const BOT_INFO = {
  name: 'Айти Лаб Bot',
  userId: '154',
  webhookPreview: 'https://1c-cms.bitrix24.ru/rest/154/••••••••••/',
  tasksToday: '17 задач · 9 EOD · 5 без EOD · 3 без доступа',
}

export default function EODPanel() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{ success: boolean; output: string } | null>(null)
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(false)
  const { toast } = useToast()

  const fetchSettings = useCallback(async () => {
    try {
      const r = await fetch('/api/settings')
      const data = await r.json()
      setSettings({ ...DEFAULT_SETTINGS, ...data })
    } catch {
      // use defaults
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRuns = useCallback(async () => {
    setLoadingRuns(true)
    try {
      const r = await fetch('/api/workflow-status?workflow=eod-inspector.yml')
      const data = await r.json()
      if (data.success) setRuns(data.runs || [])
    } catch {
      // ignore
    } finally {
      setLoadingRuns(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
    fetchRuns()
  }, [fetchSettings, fetchRuns])

  const toggleDay = (day: number) => {
    setSettings(prev => ({
      ...prev,
      enabledDays: prev.enabledDays.includes(day)
        ? prev.enabledDays.filter(d => d !== day)
        : [...prev.enabledDays, day].sort()
    }))
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (data.success) {
        toast({
          title: 'Расписание сохранено',
          description: 'Cron обновлён в .github/workflows/ нового репозитория',
        })
        fetchRuns()
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' })
      }
    } catch (err: any) {
      toast({ title: 'Ошибка сети', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const runAction = async (action: string) => {
    setActionLoading(action)
    setLastResult(null)
    try {
      let url = ''
      let reqBody: Record<string, any> = {}

      switch (action) {
        case 'report-private':
          url = '/api/send-report'
          reqBody = { mode: 'private' }
          break
        case 'report-group':
          url = '/api/send-report'
          reqBody = { mode: 'group' }
          break
        case 'reminder-1':
          url = '/api/send-reminder'
          reqBody = { round: 1 }
          break
        case 'reminder-2':
          url = '/api/send-reminder'
          reqBody = { round: 2 }
          break
        case 'productivity-private':
          url = '/api/send-productivity'
          reqBody = { mode: 'private' }
          break
        case 'productivity-group':
          url = '/api/send-productivity'
          reqBody = { mode: 'group' }
          break
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      })
      const data = await res.json()
      setLastResult({ success: data.success, output: data.output || data.error || '' })

      if (data.success) {
        toast({ title: 'Запущено!', description: data.output })
        // Poll workflow status after a short delay
        setTimeout(() => fetchRuns(), 3000)
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' })
      }
    } catch (err: any) {
      toast({ title: 'Ошибка сети', description: err.message, variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const formatRunTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRunBadge = (run: WorkflowRun) => {
    if (run.status === 'completed' && run.conclusion === 'success') {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-600 gap-1">
          <CheckCircle2 className="h-3 w-3" /> Успех
        </Badge>
      )
    }
    if (run.status === 'completed' && run.conclusion === 'failure') {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" /> Ошибка
        </Badge>
      )
    }
    if (run.status === 'in_progress' || run.status === 'queued') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> {run.status === 'queued' ? 'В очереди' : 'Выполняется'}
        </Badge>
      )
    }
    return <Badge variant="outline">{run.status}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Settings2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Айти Лаб Bot
              <Badge variant="outline" className="text-xs font-mono">user #{BOT_INFO.userId}</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Панель управления EOD-сводками и напоминаниями · Bitrix24
            </p>
          </div>
        </div>

        {/* Bot Info Card */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Webhook</div>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{BOT_INFO.webhookPreview}</code>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Сегодня</div>
                <div className="text-xs">{BOT_INFO.tasksToday}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Settings */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Расписание (МСК)
            </CardTitle>
            <CardDescription>
              Автоматическое время отправки по будням. Изменения коммитятся в GitHub Actions workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-amber-500" />
                  Напоминание #1
                </label>
                <Input
                  type="time"
                  value={settings.reminder1Time}
                  onChange={e => setSettings(prev => ({ ...prev, reminder1Time: e.target.value }))}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-red-500" />
                  Напоминание #2
                </label>
                <Input
                  type="time"
                  value={settings.reminder2Time}
                  onChange={e => setSettings(prev => ({ ...prev, reminder2Time: e.target.value }))}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                  Отчёт + Рейтинг
                </label>
                <Input
                  type="time"
                  value={settings.reportTime}
                  onChange={e => setSettings(prev => ({ ...prev, reportTime: e.target.value }))}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Дни недели</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map(day => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`h-9 w-9 rounded-md text-sm font-medium transition-colors ${
                      settings.enabledDays.includes(day)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={saveSettings} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить расписание
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* EOD Report */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ЕОД-сводка
            </CardTitle>
            <CardDescription>
              Отчёт по задачам разработчиков за сегодня
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => runAction('report-private')}
                disabled={actionLoading !== null}
                className="justify-start h-auto py-3"
              >
                {actionLoading === 'report-private' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2 text-blue-500" />
                )}
                <div className="text-left">
                  <div className="font-medium">Предпросмотр</div>
                  <div className="text-xs text-muted-foreground font-normal">Отправить Андрею в личку</div>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => runAction('report-group')}
                disabled={actionLoading !== null}
                className="justify-start h-auto py-3"
              >
                {actionLoading === 'report-group' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Users className="h-4 w-4 mr-2 text-green-500" />
                )}
                <div className="text-left">
                  <div className="font-medium">В Общий чат</div>
                  <div className="text-xs text-muted-foreground font-normal">Все увидят отчёт</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Productivity Rating */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Рейтинг продуктивности
            </CardTitle>
            <CardDescription>
              Недельный рейтинг разработчиков по затреканному времени
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => runAction('productivity-private')}
                disabled={actionLoading !== null}
                className="justify-start h-auto py-3"
              >
                {actionLoading === 'productivity-private' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2 text-blue-500" />
                )}
                <div className="text-left">
                  <div className="font-medium">Предпросмотр</div>
                  <div className="text-xs text-muted-foreground font-normal">Отправить Андрею в личку</div>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => runAction('productivity-group')}
                disabled={actionLoading !== null}
                className="justify-start h-auto py-3"
              >
                {actionLoading === 'productivity-group' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Users className="h-4 w-4 mr-2 text-green-500" />
                )}
                <div className="text-left">
                  <div className="font-medium">В Общий чат</div>
                  <div className="text-xs text-muted-foreground font-normal">Все увидят рейтинг</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reminders */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Напоминания
            </CardTitle>
            <CardDescription>
              Отправить напоминание разработчикам, у которых нет EOD
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => runAction('reminder-1')}
                disabled={actionLoading !== null}
                className="justify-start h-auto py-3"
              >
                {actionLoading === 'reminder-1' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4 mr-2 text-amber-500" />
                )}
                <div className="text-left">
                  <div className="font-medium">Раунд #1</div>
                  <div className="text-xs text-muted-foreground font-normal">Мягкое напоминание</div>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => runAction('reminder-2')}
                disabled={actionLoading !== null}
                className="justify-start h-auto py-3"
              >
                {actionLoading === 'reminder-2' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4 mr-2 text-red-500" />
                )}
                <div className="text-left">
                  <div className="font-medium">Раунд #2</div>
                  <div className="text-xs text-muted-foreground font-normal">Строгое напоминание</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Workflow Runs */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Последние запуски
                </CardTitle>
                <CardDescription className="mt-1">
                  EOD Inspector workflow — последние 5 запусков
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchRuns}
                disabled={loadingRuns}
              >
                {loadingRuns ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Обновить'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {loadingRuns ? 'Загрузка...' : 'Запусков пока не было'}
              </div>
            ) : (
              <div className="space-y-2">
                {runs.map(run => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{run.displayTitle}</div>
                      <div className="text-xs text-muted-foreground">{formatRunTime(run.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getRunBadge(run)}
                      <a
                        href={run.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Открыть в GitHub"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Action Result */}
        {lastResult && (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className={`flex items-start gap-2 ${lastResult.success ? '' : 'text-destructive'}`}>
                {lastResult.success ? (
                  <Send className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
                )}
                <p className="text-sm">{lastResult.output}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4 space-y-1">
          <div>Айти Лаб Bot · EOD Inspector · Antisakrum2004/AtiLab-bot</div>
          <div>Bitrix24 · GitHub Actions · Vercel</div>
        </div>
      </div>
    </div>
  )
}
