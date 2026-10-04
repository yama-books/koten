<#
.SYNOPSIS
Health check for start-observer.ps1 / stop-observer.ps1 / observer-status.ps1 in a temporary directory.
Uses a fast tick (-TickMs 50). Registers nothing with Task Scheduler. Exit 0 when every check passes.
#>
param([string]$Shell = "powershell")
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$root = Join-Path ([System.IO.Path]::GetTempPath()) ("hklife-start-check-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory $root | Out-Null
$state = Join-Path $root "runtime\current"
$runDir = Join-Path $root "runtime\runs\start-check"
$results = [ordered]@{}
function Invoke-Script([string]$name, [string[]]$scriptArgs) {
  # Windows PowerShell 5.1 turns child stderr into terminating errors under "Stop"; capture it as text instead.
  $ErrorActionPreference = "Continue"
  $out =& $Shell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $here $name) @scriptArgs 2>&1 | Out-String
  return @{ code = $LASTEXITCODE; out = $out }
}
function Start-Obs([string[]]$extra) { Invoke-Script "start-observer.ps1" (@("-RunId", "start-check", "-WaitSeconds", "60") + $extra) }
function SupervisorPids { @(Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -like "*observer-supervisor.cjs*$root*" } | ForEach-Object { $_.ProcessId }) }
Push-Location $root
try {
  $r = Start-Obs @("-Seed", "5", "-TickMs", "50", "-DryRun")
  $results.dryRunCreatesNothing = $r.code -eq 0 -and $r.out -match "DRY RUN" -and -not (Test-Path $runDir) -and (SupervisorPids).Count -eq 0

  $r = Start-Obs @()
  $results.newRunWithoutSeedRefused = $r.code -eq 1 -and $r.out -match "pass -Seed"

  $r = Start-Obs @("-Seed", "5", "-TickMs", "50")
  $results.newRunCreatedAndStarted = $r.code -eq 0 -and $r.out -match "STARTED" -and (Test-Path (Join-Path $runDir "run-meta.json")) -and (SupervisorPids).Count -eq 1

  $r = Start-Obs @()
  $results.secondStartRefused = $r.code -eq 1 -and $r.out -match "already running" -and (SupervisorPids).Count -eq 1

  Start-Sleep -Seconds 2
  $r = Invoke-Script "observer-status.ps1" @("-RunDir", $runDir, "-StateDir", $state, "-AppendTo", (Join-Path $root "status.jsonl"))
  $s = Get-Content (Join-Path $root "status.jsonl") -Raw | ConvertFrom-Json
  $results.statusReportsRunning = $r.code -eq 0 -and $s.heartbeatStatus -eq "running" -and $s.tick -gt 0 -and $s.observerPid -and $s.effectiveTickMs -ge 40 -and $s.effectiveTickMs -le 200

  $r = Invoke-Script "stop-observer.ps1" @("-StateDir", $state, "-TimeoutSeconds", "30")
  $deadline = (Get-Date).AddSeconds(30); while ((SupervisorPids).Count -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 300 }
  $results.stopStopsEverything = $r.out -match "status: stopped" -and (SupervisorPids).Count -eq 0 -and -not (Test-Path (Join-Path $state "supervisor.lock"))

  $r = Start-Obs @()
  $results.stopFileRefusedAndKept = $r.code -eq 1 -and $r.out -match "STOP" -and (Test-Path (Join-Path $state "STOP")) -and (SupervisorPids).Count -eq 0

  Remove-Item (Join-Path $state "STOP")   # the person decides to start again
  $r = Start-Obs @("-Seed", "6")
  $results.seedMismatchRefused = $r.code -eq 1 -and $r.out -match "does not match"

  $r = Start-Obs @()
  $segs = @(Get-ChildItem (Join-Path $runDir "segments") -Filter "segment-*.json" | Where-Object Name -match '^segment-\d{4}\.json$')
  $results.existingRunResumed = $r.code -eq 0 -and $r.out -match "resume existing run" -and $r.out -match "segment 2" -and $segs.Count -eq 1

  Invoke-Script "stop-observer.ps1" @("-StateDir", $state, "-TimeoutSeconds", "30") | Out-Null
  $deadline = (Get-Date).AddSeconds(30); while ((SupervisorPids).Count -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 300 }
  Remove-Item (Join-Path $state "STOP")
  '{"reason":"test"}' | Set-Content (Join-Path $state "ALERT.json")
  $r = Start-Obs @()
  $results.alertRefusedAndKept = $r.code -eq 1 -and $r.out -match "ALERT" -and (Test-Path (Join-Path $state "ALERT.json")) -and (SupervisorPids).Count -eq 0

  $ok = -not ($results.Values -contains $false)
  [ordered]@{ ok = $ok; shell = $Shell; checks = $results } | ConvertTo-Json -Depth 3
  if (-not $ok) { exit 1 }
} finally {
  Pop-Location
  foreach ($procId in SupervisorPids) { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue }
  Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -like "*$root*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 500
  Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue
}
