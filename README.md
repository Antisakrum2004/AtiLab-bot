# Айти Лаб Bot (AtiLab-bot)

EOD Inspector для Bitrix24 — ежедневные сводки по задачам, напоминания разработчикам и рейтинг продуктивности.

## Архитектура

```
React panel (Vercel) ──fetch──> API routes ──GitHub API──> Workflows ──node──> eod-inspector/*.js ──Bitrix24 REST──> чаты
   src/app/page.tsx         src/app/api/*         .github/workflows/         (BOT_WEBHOOK из config.js)
```

- **Frontend**: Next.js 16 + React 19 + shadcn/ui + Tailwind 4 (деплой на Vercel)
- **Backend**: Vercel serverless functions в `src/app/api/*` — только триггерят GitHub workflows
- **Runtime**: GitHub Actions runners (Ubuntu) — выполняют Node.js скрипты из `eod-inspector/`
- **Bot webhook**: `https://1c-cms.bitrix24.ru/rest/154/f896em13hhazm006/` — захардкожен в `eod-inspector/config.js`

## Структура

```
.
├── eod-inspector/                    # Node.js скрипты (zero npm deps, только Node builtins)
│   ├── config.js                     # Конфиг: BOT_WEBHOOK, разработчики, ключевые слова EOD
│   ├── inspector.js                  # EOD-сводка за день
│   ├── productivity.js               # Рейтинг продуктивности за неделю
│   ├── reminder.js                   # Напоминания раунд 1 (мягкое) и 2 (строгое)
│   ├── chart.js                      # Недельный график задач (QuickChart.io + Imgur)
│   └── sprint-summary.js             # Сводка по спринту (ручной запуск)
├── .github/workflows/
│   ├── eod-inspector.yml             # cron 22:00 MSK Пн-Пт — сводка + рейтинг + штрафы
│   ├── eod-reminder.yml              # cron 18:00 MSK Пн-Пт — раунд 1
│   └── eod-reminder-r2.yml           # cron 19:00 MSK Пн-Пт — раунд 2
├── src/
│   ├── app/
│   │   ├── page.tsx                  # React-панель управления
│   │   ├── layout.tsx                # Root layout
│   │   ├── globals.css               # Tailwind 4 + shadcn theme
│   │   └── api/
│   │       ├── send-report/route.ts  # POST {mode: 'group'|'private'} → triggers eod-inspector.yml
│   │       ├── send-reminder/route.ts # POST {round: 1|2} → triggers eod-reminder(-r2).yml
│   │       ├── send-productivity/route.ts # POST {mode} → triggers eod-inspector.yml
│   │       ├── settings/route.ts     # GET/POST — читает/обновляет cron в YAML
│   │       └── workflow-status/route.ts # GET — последние запуски workflow
│   ├── components/ui/                # shadcn/ui (card, button, input, badge, toast, toaster)
│   ├── hooks/use-toast.ts            # toast hook
│   └── lib/
│       ├── github.ts                 # GitHub REST API клиент
│       └── utils.ts                  # cn() helper
├── package.json                      # Минимальный набор зависимостей
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── tailwind.config.ts (встроен в globals.css через @theme)
├── components.json
└── eslint.config.mjs
```

## Настройка Vercel

### Env vars (Production + Preview + Development)

| Name | Value | Где взять |
|------|-------|-----------|
| `GITHUB_TOKEN` | `ghp_...` | GitHub PAT с правами `repo` + `workflow` |
| `GITHUB_REPO` | `Antisakrum2004/AtiLab-bot` | Полный путь к этому репозиторию |

## Расписание (cron)

| Workflow | Cron (UTC) | MSK | Что делает |
|----------|-----------|-----|------------|
| `eod-reminder.yml` | `0 15 * * 1-5` | 18:00 Пн-Пт | Round 1 — мягкое напоминание |
| `eod-reminder-r2.yml` | `0 16 * * 1-5` | 19:00 Пн-Пт | Round 2 — строгое напоминание |
| `eod-inspector.yml` | `0 19 * * 1-5` | 22:00 Пн-Пт | EOD-сводка + рейтинг + автоштрафы KPI |

Расписание редактируется через панель — каждый Save коммитит изменения cron в YAML через GitHub Contents API.

## Локальный запуск

```bash
npm install
npm run dev
# открыть http://localhost:3000
```

Для работы API routes локально нужно создать `.env.local`:
```
GITHUB_TOKEN=ghp_...
GITHUB_REPO=Antisakrum2004/AtiLab-bot
```

## История

Перенесён из репозитория `Antisakrum2004/bitrix-form` (commit `33fbc3b`, 2026-07-01) для разделения формы задач и бота EOD-сводки.
