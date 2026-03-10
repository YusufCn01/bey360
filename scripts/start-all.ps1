param(
  [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pgBinCandidates = @(
  "C:\Program Files\PostgreSQL\16\bin",
  "C:\laragon\bin\postgresql\postgresql\bin"
)
$pgBin = $pgBinCandidates | Where-Object { Test-Path (Join-Path $_ "postgres.exe") } | Select-Object -First 1
$pgData = "C:\laragon\data\postgres16"
$pwFile = "C:\laragon\data\postgres16_pw.txt"
$redisBin = "C:\laragon\bin\redis\redis-x64-5.0.14.1"
$redisExe = Join-Path $redisBin "redis-server.exe"
$redisCli = Join-Path $redisBin "redis-cli.exe"
$redisConf = Join-Path $redisBin "redis.windows.conf"
$pgPassword = "postgres"

function Ensure-EnvFile {
  $envFile = Join-Path $root ".env"
  $envExample = Join-Path $root ".env.example"

  if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile -Force
  }

  $content = Get-Content $envFile
  $content = $content `
    -replace "DATABASE_URL=.*", "DATABASE_URL=postgresql://postgres:$pgPassword@localhost:5432/muhasebe?schema=public" `
    -replace "APP_SECRET=.*", "APP_SECRET=local-dev-secret-key-please-change-2026"
  $content | Set-Content $envFile
}

function Ensure-Postgres {
  if (-not $pgBin) {
    throw "PostgreSQL bulunamadi. Beklenen yollar: $($pgBinCandidates -join ', ')"
  }

  if (-not (Test-Path $pgData)) {
    New-Item -ItemType Directory -Force -Path "C:\laragon\data" | Out-Null
    $pgPassword | Set-Content -Path $pwFile -NoNewline
    & "$pgBin\initdb.exe" -D $pgData -U postgres -A scram-sha-256 --pwfile=$pwFile --encoding=UTF8 --locale=C | Out-Null
    "" | Set-Content -Path $pwFile
  }

  $status = & "$pgBin\pg_ctl.exe" -D $pgData status 2>$null
  if ($LASTEXITCODE -ne 0) {
    & "$pgBin\pg_ctl.exe" -D $pgData -l "C:\laragon\data\postgres16.log" -o "-p 5432" start | Out-Null
  }

  $env:PGPASSWORD = $pgPassword
  $exists = & "$pgBin\psql.exe" -h localhost -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='muhasebe'"
  if (-not $exists) {
    & "$pgBin\createdb.exe" -h localhost -U postgres muhasebe
  }
}

function Ensure-Redis {
  if (-not (Test-Path $redisExe)) {
    throw "Redis binary bulunamadi: $redisExe"
  }

  & $redisCli -h 127.0.0.1 -p 6379 ping 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) {
    if (Test-Path $redisConf) {
      Start-Process -FilePath $redisExe -ArgumentList @($redisConf, "--port", "6379") | Out-Null
    } else {
      Start-Process -FilePath $redisExe -ArgumentList @("--port", "6379") | Out-Null
    }
    Start-Sleep -Seconds 1
  }
}

function Ensure-DatabaseSchema {
  Push-Location $root
  try {
    & npx.cmd prisma migrate deploy
    if ($LASTEXITCODE -ne 0) {
      throw "Prisma migrate deploy basarisiz oldu."
    }

    $prismaClientEntry = Join-Path $root "node_modules\@prisma\client\index.js"
    if (-not (Test-Path $prismaClientEntry)) {
      & npx.cmd prisma generate
      if ($LASTEXITCODE -ne 0) {
        throw "Prisma generate basarisiz oldu."
      }
    }

    if (-not $SkipSeed) {
      & npm.cmd run db:seed
      if ($LASTEXITCODE -ne 0) {
        throw "Seed islemi basarisiz oldu."
      }
    }
  } finally {
    Pop-Location
  }
}

function Ensure-AppAndWorker {
  $logDir = Join-Path $root ".logs"
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null

  $appListening = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  if (-not $appListening) {
    Start-Process -FilePath "npm.cmd" `
      -ArgumentList @("run", "dev") `
      -WorkingDirectory $root `
      -RedirectStandardOutput (Join-Path $logDir "app.out.log") `
      -RedirectStandardError (Join-Path $logDir "app.err.log") | Out-Null
  }

  $workerRunning = Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -eq "node.exe" -and (
        $_.CommandLine -match 'src[\\/]worker[\\/]index\.ts' -or
        $_.CommandLine -match 'npm\.cmd.+run worker'
      )
    }
  if (-not $workerRunning) {
    Start-Process -FilePath "npm.cmd" `
      -ArgumentList @("run", "worker") `
      -WorkingDirectory $root `
      -RedirectStandardOutput (Join-Path $logDir "worker.out.log") `
      -RedirectStandardError (Join-Path $logDir "worker.err.log") | Out-Null
  }
}

Ensure-EnvFile
Ensure-Postgres
Ensure-Redis
Ensure-DatabaseSchema
Ensure-AppAndWorker

Write-Output "Tum servisler baslatildi."
Write-Output "Uygulama: http://localhost:3000"
