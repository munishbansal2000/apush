param(
  [string]$AudioRoot = (Join-Path $PSScriptRoot '..\..\audio_scripts'),
  [string]$OutDir = (Join-Path $PSScriptRoot '..\agent-input\image-research\audio-scripts')
)

$ErrorActionPreference = 'Stop'
$AudioRoot = [IO.Path]::GetFullPath($AudioRoot)
$OutDir = [IO.Path]::GetFullPath($OutDir)
$utf8 = New-Object Text.UTF8Encoding($false)

function Select-CanonicalScript([IO.FileInfo[]]$Files) {
  $locked = $Files | Where-Object Name -Match '-LOCKED\.md$' | Select-Object -First 1
  $drafts = $Files | Where-Object Name -Match '-v(\d+)-.*DRAFT\.md$' | ForEach-Object {
    [pscustomobject]@{ File = $_; Version = [int]([regex]::Match($_.Name, '-v(\d+)-').Groups[1].Value) }
  } | Sort-Object Version -Descending
  $newest = $drafts | Select-Object -First 1
  if ($locked -and $newest) {
    $header = (Get-Content -LiteralPath $locked.FullName -TotalCount 6) -join "`n"
    $match = [regex]::Match($header, '\bv(\d+)\b', 'IgnoreCase')
    $lockedFrom = if ($match.Success) { [int]$match.Groups[1].Value } else { [int]::MaxValue }
    if ($newest.Version -gt $lockedFrom) { return $newest.File }
    return $locked
  }
  if ($locked) { return $locked }
  if ($newest) { return $newest.File }
  return $null
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$index = @()

Get-ChildItem -LiteralPath $AudioRoot -Directory | Where-Object Name -Match '^unit\d+$' | Sort-Object Name | ForEach-Object {
  $unitDir = $_
  $scripts = Get-ChildItem -LiteralPath $unitDir.FullName -File | Where-Object Name -Match '^apush-audio-(.+)-script-(?:v\d+-.*DRAFT|LOCKED)\.md$'
  $scripts | Group-Object { [regex]::Match($_.Name, '^apush-audio-(.+)-script-').Groups[1].Value } | ForEach-Object {
    $source = Select-CanonicalScript $_.Group
    if (-not $source) { return }
    $episode = $_.Name -replace '-', ''
    $unitOut = Join-Path $OutDir $unitDir.Name
    New-Item -ItemType Directory -Path $unitOut -Force | Out-Null
    $destination = Join-Path $unitOut "$episode.md"
    Copy-Item -LiteralPath $source.FullName -Destination $destination -Force
    $versionMatch = [regex]::Match($source.Name, '-v(\d+)-', 'IgnoreCase')
    $index += [pscustomobject]@{
      episode = $episode
      script = ($destination.Substring($OutDir.Length + 1) -replace '\\', '/')
      source = ($source.FullName.Substring($AudioRoot.Length + 1) -replace '\\', '/')
      version = if ($versionMatch.Success) { [int]$versionMatch.Groups[1].Value } else { $null }
      locked = $source.Name -match '-LOCKED\.md$'
      sha256 = (Get-FileHash -LiteralPath $source.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
  }
}

$finales = Join-Path $AudioRoot 'finales'
if (Test-Path -LiteralPath $finales) {
  Get-ChildItem -LiteralPath $finales -File | Where-Object Name -Match '^apush-audio-finale-(\d+)-script-v(\d+)-DRAFT\.md$' |
    Group-Object { [regex]::Match($_.Name, '^apush-audio-finale-(\d+)-').Groups[1].Value } | ForEach-Object {
      $source = $_.Group | Sort-Object { [int]([regex]::Match($_.Name, '-v(\d+)-').Groups[1].Value) } -Descending | Select-Object -First 1
      $episode = "finale$($_.Name)"
      $finaleOut = Join-Path $OutDir 'finales'
      New-Item -ItemType Directory -Path $finaleOut -Force | Out-Null
      $destination = Join-Path $finaleOut "$episode.md"
      Copy-Item -LiteralPath $source.FullName -Destination $destination -Force
      $index += [pscustomobject]@{
        episode = $episode
        script = ($destination.Substring($OutDir.Length + 1) -replace '\\', '/')
        source = ($source.FullName.Substring($AudioRoot.Length + 1) -replace '\\', '/')
        version = [int]([regex]::Match($source.Name, '-v(\d+)-').Groups[1].Value)
        locked = $false
        sha256 = (Get-FileHash -LiteralPath $source.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      }
    }
}

$index = $index | Sort-Object episode
$indexPath = Join-Path $OutDir 'index.json'
[IO.File]::WriteAllText($indexPath, (($index | ConvertTo-Json -Depth 4) + "`n"), $utf8)
Write-Output "Exported $($index.Count) canonical audio scripts to $OutDir"
