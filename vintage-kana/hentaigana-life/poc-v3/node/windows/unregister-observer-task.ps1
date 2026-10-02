<#
.SYNOPSIS
Removes the observer Task Scheduler task. Does not stop a running observer; use stop-observer.ps1 first.
#>
[CmdletBinding(SupportsShouldProcess)]
param([string]$TaskName = "HentaiganaLifeObserver")
$ErrorActionPreference = "Stop"
if (-not (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue)) { Write-Host "Task $TaskName is not registered."; return }
if ($PSCmdlet.ShouldProcess($TaskName, "Unregister scheduled task")) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Unregistered $TaskName."
}
