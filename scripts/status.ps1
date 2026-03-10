$ErrorActionPreference = "SilentlyContinue"

$pgBinCandidates = @(
  "C:\Program Files\PostgreSQL\16\bin",
  "C:\laragon\bin\postgresql\postgresql\bin"
)
$pgBin = $pgBinCandidates | Where-Object { Test-Path (Join-Path $_ "pg_ctl.exe") } | Select-Object -First 1
$redisCli = "C:\laragon\bin\redis\redis-x64-5.0.14.1\redis-cli.exe"

Write-Output "== PostgreSQL =="
if ($pgBin) {
  & "$pgBin\pg_ctl.exe" -D "C:\laragon\data\postgres16" status
} else {
  Write-Output "PostgreSQL binary bulunamadi. Beklenen yollar: $($pgBinCandidates -join ', ')"
}

Write-Output "`n== Redis =="
if (Test-Path $redisCli) {
  & $redisCli -h 127.0.0.1 -p 6379 ping
} else {
  Write-Output "Redis cli bulunamadi."
}

Write-Output "`n== App Health =="
try {
  (Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 10).Content
  (Invoke-WebRequest -Uri "http://localhost:3000/api/ready" -UseBasicParsing -TimeoutSec 10).Content
} catch {
  Write-Output "Uygulama endpointleri ulasilamiyor."
}
