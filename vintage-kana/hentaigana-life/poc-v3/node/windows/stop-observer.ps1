<#
.SYNOPSIS
Stops the continuous observer gracefully by creating <StateDir>\STOP and waiting for the final heartbeat.

.DESCRIPTION
STOP stays in place, so the supervisor and the scheduled task do not start the observer again until it is
deleted (see the start instructions in node/README.md).
#>
param(
  [Parameter(Mandatory)][string]$StateDir,
  [int]$TimeoutSeconds = 60
)
$ErrorActionPreference = "Stop"
$stop = Join-Path $StateDir "STOP"
$heartbeat = Join-Path $StateDir "heartbeat.json"
New-Item -ItemType File -Force $stop | Out-Null
Write-Host "Created $stop"
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $deadline) {
  try { $hb = Get-Content $heartbeat -Raw | ConvertFrom-Json } catch { $hb = $null }
  if ($hb -and $hb.status -ne "running" -and $hb.status -ne "recovering") {
    Write-Host "Observer status: $($hb.status) at tick $($hb.tick) (reason: $($hb.stopReason))"
    return
  }
  Start-Sleep -Milliseconds 500
}
Write-Warning "No stopped heartbeat within $TimeoutSeconds s. The observer may not be running; check $StateDir\supervisor.log."
