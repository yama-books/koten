$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$node = 'D:\dev\tools\node-v26.9.0-win-x64\node.exe'
$java = 'D:\dev\tools\temurin-21\jdk-21.0.12.1+1'
$cloudflared = 'D:\dev\tools\cloudflared-windows-amd64.exe'
$logs = 'D:\dev\qr-sync-preview-logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null

$env:JAVA_HOME = $java
$env:PATH = "$(Split-Path $node);$java\bin;$env:PATH"
$env:XDG_CONFIG_HOME = 'D:\dev\qr-sync-preview-config'
New-Item -ItemType Directory -Force -Path $env:XDG_CONFIG_HOME | Out-Null

function Start-HiddenService([string]$name, [string]$file, [string[]]$arguments, [string]$directory) {
  $out = Join-Path $logs "$name.out.log"
  $err = Join-Path $logs "$name.err.log"
  $process = Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $directory -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
  Write-Output "$name PID=$($process.Id) stdout=$out stderr=$err"
}

Start-HiddenService 'firestore' $node @(
  (Join-Path $repo 'tests\rules\node_modules\firebase-tools\lib\bin\firebase.js'),
  'emulators:start', '--only', 'firestore', '--project', 'demo-koten-device',
  '--config', '../../firebase/firebase.device-preview.json'
) (Join-Path $repo 'tests\rules')
Start-HiddenService 'vite' $node @(
  (Join-Path $repo 'node_modules\vite\bin\vite.js'),
  'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'
) (Join-Path $repo 'packages\hyakunin')
Start-HiddenService 'proxy' $node @(
  (Join-Path $repo 'tools\qr-sync-device-preview\proxy.mjs')
) $repo
Start-HiddenService 'tunnel' $cloudflared @(
  'tunnel', '--url', 'http://127.0.0.1:4180', '--no-autoupdate'
) $repo
