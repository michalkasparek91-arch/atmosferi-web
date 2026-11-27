param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$url = 'http://127.0.0.1:4317/'

function Test-LeadDashboard {
    try {
        $scope = Invoke-RestMethod -Uri ($url + 'api/scope') -TimeoutSec 3
        return ($null -ne $scope.markets.DE -and $scope.active.Count -gt 0)
    } catch { return $false }
}

try {
    if (-not (Test-LeadDashboard)) {
        Start-ScheduledTask -TaskName 'Atmosferi - Lead Dashboard'
        $deadline = [DateTime]::UtcNow.AddSeconds(25)
        do {
            Start-Sleep -Milliseconds 500
            $ready = Test-LeadDashboard
        } until ($ready -or [DateTime]::UtcNow -ge $deadline)
        if (-not $ready) { throw 'Mistni panel na portu 4317 neodpovida.' }
    }
    if ($CheckOnly) { Write-Output $url } else { Start-Process $url }
} catch {
    if ($CheckOnly) { throw }
    (New-Object -ComObject WScript.Shell).Popup($_.Exception.Message, 0, 'Atmosferi - Sber kontaktu', 16) | Out-Null
    exit 1
}
