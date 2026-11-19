$ErrorActionPreference = 'Stop'

$taskName = 'Atmosferi - DE Marketing Agencies'
$dashboardName = 'Atmosferi - Lead Dashboard'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).ProviderPath
$node = (Get-Command node.exe -ErrorAction Stop).Source
$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
$entry = Join-Path $PSScriptRoot 'find-business-leads.mjs'
$dashboard = Join-Path $PSScriptRoot 'de-agency-dashboard.mjs'
$logFolder = Join-Path $repo 'artifacts\private\lead-finder\de-agencies'
New-Item -ItemType Directory -Path $logFolder -Force | Out-Null

$nodeLiteral = $node.Replace("'", "''")
$entryLiteral = $entry.Replace("'", "''")
$logLiteral = $logFolder.Replace("'", "''")
$taskCommand = @'
$log = Join-Path '{0}' ('collector-' + (Get-Date -Format 'yyyy-MM-dd') + '-utf8.log');
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
& '{1}' '{2}' --background-de-agencies 2>&1 | Out-File -LiteralPath $log -Append -Encoding utf8;
exit $LASTEXITCODE
'@ -f $logLiteral, $nodeLiteral, $entryLiteral
$taskArguments = '-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -Command "' + ($taskCommand -replace '\r?\n', ' ') + '"'
$action = New-ScheduledTaskAction -Execute $powershell -Argument $taskArguments -WorkingDirectory $repo
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$timer = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(15) -RepetitionInterval (New-TimeSpan -Minutes 15)
$logon = New-ScheduledTaskTrigger -AtLogOn -User $user
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 40)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($timer, $logon) -Principal $principal `
    -Settings $settings -Description 'Collects publicly listed German marketing agency contacts for the Atmosferi review queue.' -Force | Out-Null

$dashboardLiteral = $dashboard.Replace("'", "''")
$dashboardCommand = @'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
& '{0}' '{1}' 2>&1 | Out-File -LiteralPath (Join-Path '{2}' 'dashboard.log') -Append -Encoding utf8;
exit $LASTEXITCODE
'@ -f $nodeLiteral, $dashboardLiteral, $logLiteral
$dashboardArguments = '-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -Command "' + ($dashboardCommand -replace '\r?\n', ' ') + '"'
$dashboardAction = New-ScheduledTaskAction -Execute $powershell -Argument $dashboardArguments -WorkingDirectory $repo
$dashboardSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $dashboardName -Action $dashboardAction -Trigger $logon -Principal $principal `
    -Settings $dashboardSettings -Description 'Localhost-only status and control panel for the Atmosferi lead collector.' -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Start-ScheduledTask -TaskName $dashboardName
Get-ScheduledTask -TaskName $taskName, $dashboardName | Select-Object TaskName, State
