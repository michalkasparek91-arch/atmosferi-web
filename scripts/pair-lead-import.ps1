$ErrorActionPreference = 'Stop'
$folder = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Atmosferi\lead-import'
$file = Join-Path $folder 'device.xml'
if (-not (Test-Path -LiteralPath $file)) {
    [IO.Directory]::CreateDirectory($folder) | Out-Null
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $key = [BitConverter]::ToString($bytes).Replace('-','').ToLowerInvariant()
    ConvertTo-SecureString $key -AsPlainText -Force | Export-Clixml -LiteralPath $file -NoClobber
}
$secure = Import-Clixml -LiteralPath $file
$key = [Net.NetworkCredential]::new('', $secure).Password
if ($key -notmatch '^[0-9a-f]{64}$') { throw 'Invalid collector key' }
$sha = [Security.Cryptography.SHA256]::Create()
try { [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($key))).Replace('-','').ToLowerInvariant() }
finally { $sha.Dispose() }
