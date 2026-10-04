<#
.SYNOPSIS
Starts the continuous observer in the background: creates the run if it is new, otherwise resumes it.

.DESCRIPTION
1. Refuses to start while <StateDir>\STOP or ALERT.json exists (they are never deleted here).
2. Refuses a second start while a supervisor or observer for this state directory is alive.
3. New run (no run directory): node observer.cjs --create with -Seed. Existing run: resumes it
   (it must be a continuous run; -Seed, if given, must match).
4. Starts observer-supervisor.cjs in its own hidden console, so closing this terminal does not stop it.
5. Waits until the heartbeat shows the new observer running and its tick advancing, then exits.
Use -DryRun to run every check and print what would happen without creating or starting anything.
Run from any directory; relative paths resolve against the current directory.

.EXAMPLE
powershell -File .\app\source\vintage-kana\hentaigana-life\poc-v3\node\windows\start-observer.ps1 -RunId observer-continuous-20261003 -Seed 20261003
#>
param(
  [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9._-]+$')][string]$RunId,
  [Nullable[long]]$Seed = $null,
  [string]$RunsDir = ".\runtime\runs",
  [string]$StateDir = ".\runtime\current",
  [Nullable[int]]$TickMs = $null,
  [int]$WaitSeconds = 120,
  [string]$NodePath = "",
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"
function Fail([string]$message) { Write-Host "NOT STARTED: $message" -ForegroundColor Yellow; exit 1 }
function FullPath([string]$p) { if ([System.IO.Path]::IsPathRooted($p)) { [System.IO.Path]::GetFullPath($p) } else { [System.IO.Path]::GetFullPath((Join-Path (Get-Location).ProviderPath $p)) } }
function NowMs { [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }
function ReadJson([string]$file) { try { Get-Content -LiteralPath $file -Raw -Encoding utf8 | ConvertFrom-Json } catch { $null } }
function NodeAlive($procId) { if (-not $procId) { return $false }; $p = Get-Process -Id ([int]$procId) -ErrorAction SilentlyContinue; return [bool]($p -and $p.ProcessName -eq "node") }

$nodeDir = Split-Path -Parent $PSScriptRoot
$observer = Join-Path $nodeDir "observer.cjs"
$supervisor = Join-Path $nodeDir "observer-supervisor.cjs"
if (-not $NodePath) { $NodePath = (Get-Command node -ErrorAction Stop).Source }
$RunsDir = FullPath $RunsDir
$StateDir = FullPath $StateDir
$runDir = Join-Path $RunsDir $RunId
$stopFile = Join-Path $StateDir "STOP"
$alertFile = Join-Path $StateDir "ALERT.json"
$lockFile = Join-Path $StateDir "supervisor.lock"
$heartbeatFile = Join-Path $StateDir "heartbeat.json"
$logFile = Join-Path $StateDir "supervisor.log"

Write-Host "Run:       $runDir"
Write-Host "State dir: $StateDir"

# 1. STOP / ALERT are decisions by a person or the supervisor; never clear them here.
if (Test-Path -LiteralPath $stopFile) {
  Fail "$stopFile exists. The observer was stopped on purpose (stop-observer.ps1). Delete that file yourself if you want to start again, then rerun this script."
}
if (Test-Path -LiteralPath $alertFile) {
  Fail "$alertFile exists: the supervisor stopped because the observer refused to resume or crashed too often. Read it and $logFile first. After review, delete ALERT.json (or start the supervisor with --clear-alert)."
}

# 2. Double start.
$lock = ReadJson $lockFile
if ($lock -and (NodeAlive $lock.pid)) { Fail "a supervisor (pid $($lock.pid)) is already running for $StateDir (run $($lock.run))." }
$hb = ReadJson $heartbeatFile
if ($hb -and $hb.status -in @("running", "recovering") -and (NodeAlive $hb.pid) -and ((NowMs) - $hb.wallTimeMs) -lt 120000) {
  Fail "an observer (pid $($hb.pid), run $($hb.runId)) is still running for $StateDir."
}

# 3. Create or resume.
$metaFile = Join-Path $runDir "run-meta.json"
if (Test-Path -LiteralPath $runDir) {
  if (-not (Test-Path -LiteralPath $metaFile)) { Fail "$runDir exists but has no run-meta.json; refusing to touch it." }
  $meta = ReadJson $metaFile
  if ($meta.mode -ne "continuous") { Fail "$RunId is a '$($meta.mode)' run, not a continuous run created by observer.cjs." }
  if ($null -ne $Seed -and [long]$meta.seed -ne $Seed) { Fail "-Seed $Seed does not match the existing run's seed $($meta.seed)." }
  if ($null -ne $TickMs) { Fail "-TickMs applies only when creating a run (this run uses $($meta.tickMs) ms)." }
  $mode = "resume"
  Write-Host "Mode:      resume existing run (seed $($meta.seed), $($meta.tickMs) ms/tick, fingerprint $($meta.compatibility.fingerprint.Substring(0,12))...)"
} else {
  if ($null -eq $Seed) { Fail "$runDir does not exist; pass -Seed to create a new run." }
  $mode = "create"
  Write-Host "Mode:      create new run (seed $Seed$(if ($null -ne $TickMs) { ", $TickMs ms/tick" }))"
}
$supArgs = "`"$supervisor`" --run `"$runDir`" --state-dir `"$StateDir`""
if ($DryRun) {
  if ($mode -eq "create") { Write-Host "Would run: $NodePath `"$observer`" --create --output `"$RunsDir`" --run-id $RunId --seed $Seed$(if ($null -ne $TickMs) { " --tick-ms $TickMs" })" }
  Write-Host "Would start (hidden window): $NodePath $supArgs"
  Write-Host "DRY RUN: all checks passed; nothing was created or started."
  exit 0
}
if ($mode -eq "create") {
  New-Item -ItemType Directory -Force $RunsDir | Out-Null
  $createArgs = @($observer, "--create", "--output", $RunsDir, "--run-id", $RunId, "--seed", "$Seed")
  if ($null -ne $TickMs) { $createArgs += @("--tick-ms", "$TickMs") }
  $out = & $NodePath @createArgs 2>&1
  if ($LASTEXITCODE -ne 0) { Write-Host ($out | Out-String); Fail "observer.cjs --create failed (exit $LASTEXITCODE)." }
  Write-Host "Created:   $runDir"
}

# 4. Start the supervisor in its own hidden console.
New-Item -ItemType Directory -Force $StateDir | Out-Null
$startedMs = NowMs
$proc = Start-Process -FilePath $NodePath -ArgumentList $supArgs -WorkingDirectory (Split-Path -Parent $nodeDir) -WindowStyle Hidden -PassThru
Write-Host "Supervisor pid $($proc.Id) started; waiting for the observer heartbeat..."

# 5. Confirm: a heartbeat written after start, for this run, status running, with the tick advancing.
$deadline = (Get-Date).AddSeconds($WaitSeconds)
$firstTick = $null
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 500
  if ($proc.HasExited) {
    Write-Host "--- last lines of $logFile ---"; if (Test-Path -LiteralPath $logFile) { Get-Content -LiteralPath $logFile -Tail 15 }
    Fail "the supervisor exited with code $($proc.ExitCode) before the observer was confirmed running."
  }
  $hb = ReadJson $heartbeatFile
  if (-not $hb -or $hb.runId -ne $RunId -or $hb.wallTimeMs -lt $startedMs -or $hb.status -ne "running") { continue }
  if ($null -eq $firstTick) { $firstTick = [long]$hb.tick; continue }
  if ([long]$hb.tick -gt $firstTick) {
    Write-Host ""
    Write-Host "STARTED: observer pid $($hb.pid) is running $RunId (segment $($hb.segment), tick $($hb.tick), $($hb.tickMs) ms/tick)." -ForegroundColor Green
    Write-Host "Supervisor pid $($proc.Id) keeps running in the background; this terminal can be closed."
    Write-Host "Status: powershell -File `"$PSScriptRoot\observer-status.ps1`" -RunDir `"$runDir`" -StateDir `"$StateDir`""
    Write-Host "Stop:   powershell -File `"$PSScriptRoot\stop-observer.ps1`" -StateDir `"$StateDir`""
    exit 0
  }
}
Fail "no advancing heartbeat within $WaitSeconds s (the supervisor pid $($proc.Id) is still running; check $logFile and stop it with stop-observer.ps1 if needed)."
