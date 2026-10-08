param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Venv = Join-Path $Root '.venv-pipeline'
$Python = Join-Path $Venv 'Scripts\python.exe'
$ModelRoot = Join-Path $Root 'models'
$Model = Join-Path $ModelRoot 'vosk-model-small-en-us-0.15'

function Find-BootstrapPython {
  # Force this to remain an array. PowerShell unwraps a one-item pipeline to a
  # scalar string, where `$candidates[0]` is the first character (for example
  # `C`) instead of the first path.
  [string[]]$candidates = @(@(
    $env:PIPELINE_BOOTSTRAP_PYTHON,
    'C:\Users\munis\projects\fish_exmple\.venv\Scripts\python.exe'
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) })
  if ($candidates.Count -gt 0) { return [string]$candidates[0] }
  foreach ($name in @('py', 'python')) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  throw 'No Python runtime found. Set PIPELINE_BOOTSTRAP_PYTHON to a Python 3.11/3.12 executable.'
}

if ($Force -and (Test-Path -LiteralPath $Venv)) {
  $resolved = [IO.Path]::GetFullPath($Venv)
  $expected = [IO.Path]::GetFullPath((Join-Path $Root '.venv-pipeline'))
  if ($resolved -ne $expected) { throw "Refusing to remove unexpected path: $resolved" }
  Remove-Item -LiteralPath $resolved -Recurse -Force
}

if (-not (Test-Path -LiteralPath $Python)) {
  $Bootstrap = Find-BootstrapPython
  Write-Host "[setup] creating $Venv with $Bootstrap"
  & $Bootstrap -m venv $Venv
}

Write-Host '[setup] installing Edge TTS and Vosk'
& $Python -m pip install --upgrade pip
& $Python -m pip install -r (Join-Path $Root 'requirements-pipeline.txt')

if (-not (Test-Path -LiteralPath $Model)) {
  New-Item -ItemType Directory -Force -Path $ModelRoot | Out-Null
  $Zip = Join-Path ([IO.Path]::GetTempPath()) 'apush-vosk-model-small-en-us-0.15.zip'
  try {
    Write-Host '[setup] downloading Vosk English model (~40 MB)'
    Invoke-WebRequest -Uri 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip' -OutFile $Zip
    Expand-Archive -LiteralPath $Zip -DestinationPath $ModelRoot -Force
  }
  finally {
    if (Test-Path -LiteralPath $Zip) { Remove-Item -LiteralPath $Zip -Force }
  }
}

& $Python -c "import edge_tts, vosk; print('[setup] Python dependencies OK')"
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw 'ffmpeg is not on PATH' }
if (-not (Get-Command ffprobe -ErrorAction SilentlyContinue)) { throw 'ffprobe is not on PATH' }
Write-Host "[setup] Vosk model: $Model"
Write-Host '[setup] pipeline dependencies ready'
