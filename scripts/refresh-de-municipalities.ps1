$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).ProviderPath
$registry = Join-Path $repo 'artifacts\private\lead-finder\de-agencies\registry'
New-Item -Path $registry -ItemType Directory -Force | Out-Null
$source = 'https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/Archiv/GV100ADQ/GV100AD3QAktuell.html'
$listing = Invoke-WebRequest -UseBasicParsing -Uri $source -TimeoutSec 30
$download = $listing.Links | Where-Object { $_.href -match 'GV100AD3QAktuell\.zip' } | Select-Object -First 1 -ExpandProperty href
if (-not $download) { throw 'Destatis GV100 download link missing.' }
$url = [uri]::new([uri]$source, [Net.WebUtility]::HtmlDecode($download))
if ($url.Scheme -ne 'https' -or $url.Host -ne 'www.destatis.de') { throw 'Unexpected Destatis download URL.' }
$zip = Join-Path $registry 'GV100AD-latest.zip'
Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $zip -TimeoutSec 60
$unpacked = Join-Path $registry ('extract-' + [Guid]::NewGuid().ToString('N'))
Expand-Archive -LiteralPath $zip -DestinationPath $unpacked
$inputFile = Get-ChildItem -LiteralPath $unpacked -Filter 'GV100AD_*.txt' -File -Recurse | Select-Object -First 1
if (-not $inputFile) { throw 'Official municipality dataset missing from the archive.' }
& node (Join-Path $PSScriptRoot 'lib\de-agency-plan.mjs') --load-registry $inputFile.FullName
if ($LASTEXITCODE -ne 0) { throw 'Registry import failed.' }
