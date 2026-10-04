<#
.SYNOPSIS
Registers a Windows Task Scheduler task that keeps the continuous observer supervisor running.

.DESCRIPTION
Triggers: at log on of the current user, and every 15 minutes. The 15-minute trigger doubles as a watchdog
for the supervisor itself: a second supervisor exits at once while one is running (supervisor.lock), and
nothing starts while <StateDir>\STOP or ALERT.json exists. Runs only while the user is logged on (no stored
password). Changes persistent system configuration, so it is run by the user, never automatically.
Use -WhatIf to see what would be registered.

.EXAMPLE
.\register-observer-task.ps1 -RunDir D:\dev\koten\vintage-kana\hentaigana-life-observer\runtime\runs\observer-continuous-20261003 -StateDir D:\dev\koten\vintage-kana\hentaigana-life-observer\runtime\current
#>
[CmdletBinding(SupportsShouldProcess)]
param(
  [Parameter(Mandatory)][string]$RunDir,
  [Parameter(Mandatory)][string]$StateDir,
  [string]$TaskName = "HentaiganaLifeObserver",
  [string]$NodePath = (Get-Command node -ErrorAction Stop).Source,
  [int]$RepeatMinutes = 15
)
$ErrorActionPreference = "Stop"
$nodeDir = Split-Path -Parent $PSScriptRoot
$supervisor = Join-Path $nodeDir "observer-supervisor.cjs"
$RunDir = (Resolve-Path $RunDir).Path
if (-not (Test-Path (Join-Path $RunDir "run-meta.json"))) { throw "run-meta.json not found in $RunDir (create the run with observer.cjs --create first)" }
$StateDir = [System.IO.Path]::GetFullPath($StateDir)

$arguments = "`"$supervisor`" --run `"$RunDir`" --state-dir `"$StateDir`""
$action = New-ScheduledTaskAction -Execute $NodePath -Argument $arguments -WorkingDirectory (Split-Path -Parent $nodeDir)
$atLogOn = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$repeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $RepeatMinutes)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Write-Host "Task:      $TaskName"
Write-Host "Command:   $NodePath $arguments"
Write-Host "Triggers:  at log on; every $RepeatMinutes minutes"
if ($PSCmdlet.ShouldProcess($TaskName, "Register scheduled task")) {
  New-Item -ItemType Directory -Force $StateDir | Out-Null
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($atLogOn, $repeat) -Settings $settings -Principal $principal -Description "Hentaigana Life continuous observer supervisor ($RunDir)" | Out-Null
  Write-Host "Registered. Stop the observer with stop-observer.ps1 -StateDir `"$StateDir`"; remove the task with unregister-observer-task.ps1."
}
