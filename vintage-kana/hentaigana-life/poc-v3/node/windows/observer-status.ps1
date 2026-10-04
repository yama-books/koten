<#
.SYNOPSIS
Read-only status of a continuous observer run: processes, CPU/memory, ticks, effective tick interval,
checkpoints, chunks, event and snapshot sizes, ALERT and log problems.

.DESCRIPTION
Changes nothing. With -AppendTo FILE, also appends the same numbers as one JSON line (for trend tracking).
#>
param(
  [Parameter(Mandatory)][string]$RunDir,
  [Parameter(Mandatory)][string]$StateDir,
  [string]$AppendTo = ""
)
$ErrorActionPreference = "Stop"
function ReadJson([string]$file) { try { Get-Content -LiteralPath $file -Raw -Encoding utf8 | ConvertFrom-Json } catch { $null } }
function FullPath([string]$p) { if ([System.IO.Path]::IsPathRooted($p)) { [System.IO.Path]::GetFullPath($p) } else { [System.IO.Path]::GetFullPath((Join-Path (Get-Location).ProviderPath $p)) } }
# PowerShell 7 ConvertFrom-Json turns ISO strings into DateTime; 5.1 leaves them as strings.
function IsoMs($v) { if ($v -is [DateTime]) { ([DateTimeOffset]$v).ToUnixTimeMilliseconds() } else { [DateTimeOffset]::Parse([string]$v, [Globalization.CultureInfo]::InvariantCulture).ToUnixTimeMilliseconds() } }
function NowMs { [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }
function Proc($procId) { if (-not $procId) { return $null }; $p = Get-Process -Id ([int]$procId) -ErrorAction SilentlyContinue; if ($p -and $p.ProcessName -eq "node") { $p } else { $null } }
function Mb($bytes) { [math]::Round($bytes / 1MB, 2) }

$RunDir = FullPath $RunDir
$StateDir = FullPath $StateDir
$meta = ReadJson (Join-Path $RunDir "run-meta.json")
if (-not $meta) { throw "run-meta.json not found in $RunDir" }
$hb = ReadJson (Join-Path $StateDir "heartbeat.json")
$lock = ReadJson (Join-Path $StateDir "supervisor.lock")
$now = NowMs

$segDir = Join-Path $RunDir "segments"
$segments = @(Get-ChildItem -LiteralPath $segDir -Filter "segment-*.json" | Where-Object { $_.Name -match '^segment-\d{4}\.json$' } | Sort-Object Name | ForEach-Object { ReadJson $_.FullName })
$running = @(Get-ChildItem -LiteralPath $segDir -Filter "*.running.json" | ForEach-Object { ReadJson $_.FullName })
$current = $running | Select-Object -Last 1

$chunkFiles = @(Get-ChildItem -LiteralPath (Join-Path $RunDir "events") -Filter "seg*.jsonl")
$manifest = @(Get-Content -LiteralPath (Join-Path $RunDir "events\chunks.jsonl") -Encoding utf8 -ErrorAction SilentlyContinue | Where-Object { $_ } | ForEach-Object { $_ | ConvertFrom-Json })
$eventBytes = ($chunkFiles | Measure-Object Length -Sum).Sum
$checkpoints = @(Get-ChildItem -LiteralPath (Join-Path $RunDir "checkpoints") -Filter "*.json")
$snapshots = @(Get-ChildItem -LiteralPath (Join-Path $RunDir "snapshots") -Filter "*.json")
$latestSnap = @($checkpoints + $snapshots) | Sort-Object Name | Select-Object -Last 1

# Wall time actually spent running: finished segments plus the running one.
$runMs = 0
foreach ($s in $segments) { if ($s.startedAt -and $s.finishedAt) { $runMs += ((IsoMs $s.finishedAt) - (IsoMs $s.startedAt)) } }
if ($current) { $runMs += $now - (IsoMs $current.startedAt) }
$tick = if ($hb -and $hb.runId -eq $meta.runId) { [long]$hb.tick } else { $null }
$segTicks = if ($current -and $null -ne $tick) { $tick - [long]$current.startTick } else { $null }
$segMs = if ($current) { $now - (IsoMs $current.startedAt) } else { $null }

$sup = if ($lock) { Proc $lock.pid } else { $null }
$obs = if ($current) { Proc $current.pid } else { $null }
$logFile = Join-Path $StateDir "supervisor.log"
$problems = @()
if (Test-Path -LiteralPath $logFile) { $problems = @(Select-String -LiteralPath $logFile -Pattern 'ALERT|Error|refus|crash|killing|exited with (?!0\b)' | Select-Object -Last 10 | ForEach-Object { $_.Line }) }
$alert = ReadJson (Join-Path $StateDir "ALERT.json")

$status = [ordered]@{
  at = (Get-Date).ToString("o")
  runId = $meta.runId
  heartbeatStatus = $hb.status
  heartbeatAgeSec = if ($hb) { [math]::Round(($now - $hb.wallTimeMs) / 1000, 1) } else { $null }
  stopFile = Test-Path -LiteralPath (Join-Path $StateDir "STOP")
  alert = [bool]$alert
  supervisorPid = if ($sup) { $sup.Id } else { $null }
  supervisorCpuSec = if ($sup) { [math]::Round($sup.CPU, 1) } else { $null }
  supervisorMemMb = if ($sup) { Mb $sup.WorkingSet64 } else { $null }
  observerPid = if ($obs) { $obs.Id } else { $null }
  observerCpuSec = if ($obs) { [math]::Round($obs.CPU, 1) } else { $null }
  observerMemMb = if ($obs) { Mb $obs.WorkingSet64 } else { $null }
  observerPrivateMb = if ($obs) { Mb $obs.PrivateMemorySize64 } else { $null }
  tick = $tick
  sequence = if ($hb) { $hb.sequence } else { $null }
  segments = $segments.Count + $running.Count
  segmentStatuses = (($segments | ForEach-Object { $_.status }) + ($running | ForEach-Object { "running" })) -join ","
  currentSegmentTicks = $segTicks
  effectiveTickMs = if ($segTicks -gt 0) { [math]::Round($segMs / $segTicks, 1) } else { $null }
  runningHours = [math]::Round($runMs / 3600000, 2)
  eventChunks = $chunkFiles.Count
  chunksSealed = $manifest.Count
  chunkCloseReasons = (($manifest | Group-Object closeReason | ForEach-Object { "$($_.Name)=$($_.Count)" }) -join ",")
  eventBytesMb = Mb $eventBytes
  eventMbPerRunningDay = if ($runMs -gt 0) { [math]::Round((Mb $eventBytes) / ($runMs / 86400000), 1) } else { $null }
  checkpoints = $checkpoints.Count
  permanentSnapshots = $snapshots.Count
  latestSnapshot = if ($latestSnap) { $latestSnap.Name } else { $null }
  latestSnapshotKb = if ($latestSnap) { [math]::Round($latestSnap.Length / 1KB, 1) } else { $null }
  logProblemLines = $problems.Count
}
$status.GetEnumerator() | ForEach-Object { "{0,-22} {1}" -f $_.Key, $_.Value }
if ($problems.Count) { "--- recent problem lines in supervisor.log ---"; $problems }
if ($alert) { "--- ALERT.json ---"; $alert | ConvertTo-Json -Depth 4 }
if ($AppendTo) { ($status | ConvertTo-Json -Compress) | Add-Content -LiteralPath $AppendTo -Encoding utf8 }
