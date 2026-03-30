param(
    [int]$ThresholdMb = 4500,
    [switch]$Cleanup,
    [switch]$Json,
    [switch]$Watch,
    [int]$IntervalSec = 5
)

$ErrorActionPreference = "Stop"
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))

function Get-NodeSnapshot {
    $processRows = @()
    $processMap = @{}

    Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
        $processMap[$_.Id] = $_
    }

    if ($processMap.Count -eq 0) {
        return @()
    }

    $wmiRows = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
    foreach ($row in $wmiRows) {
        $proc = $processMap[[int]$row.ProcessId]
        if (-not $proc) { continue }

        $commandLine = if ($null -eq $row.CommandLine) { "" } else { [string]$row.CommandLine }
        $isRepoProcess = $commandLine.IndexOf($repoRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
        $isLikelyHeavy = $commandLine -match "next(\.exe)?\s+dev|tsx|playwright|puppeteer|sharp"

        $processRows += [pscustomobject]@{
            Id = $proc.Id
            ProcessName = $proc.ProcessName
            MemoryMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
            Cpu = if ($null -eq $proc.CPU) { 0 } else { [math]::Round($proc.CPU, 2) }
            RepoProcess = $isRepoProcess
            HeavyProcess = $isLikelyHeavy
            CommandLine = $commandLine
        }
    }

    return $processRows | Sort-Object MemoryMB -Descending
}

function Get-Port3000Owners {
    $owners = @()
    try {
        $owners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
    } catch {
        $owners = @()
    }

    return @($owners | Where-Object { $_ })
}

function Get-TotalNodeMemoryMb($rows) {
    if (-not $rows -or $rows.Count -eq 0) { return 0 }
    return [math]::Round((($rows | Measure-Object MemoryMB -Sum).Sum), 2)
}

function Format-CommandLine($text) {
    if ([string]::IsNullOrWhiteSpace($text)) { return "" }
    if ($text.Length -le 120) { return $text }
    return $text.Substring(0, 117) + "..."
}

function Cleanup-NodeProcesses {
    param(
        [array]$Rows,
        [int]$Threshold
    )

    $totalBefore = Get-TotalNodeMemoryMb $Rows
    $portOwners = Get-Port3000Owners
    $killed = New-Object System.Collections.Generic.List[object]

    $candidates = @(
        $Rows | Where-Object { $_.RepoProcess -or ($portOwners -contains $_.Id) }
    ) | Sort-Object @{ Expression = { if ($portOwners -contains $_.Id) { 0 } else { 1 } } }, @{ Expression = "MemoryMB"; Descending = $true }

    foreach ($candidate in $candidates) {
        if ((Get-TotalNodeMemoryMb (Get-NodeSnapshot)) -le $Threshold) { break }

        try {
            Stop-Process -Id $candidate.Id -Force -ErrorAction Stop
            $killed.Add([pscustomobject]@{
                Id = $candidate.Id
                MemoryMB = $candidate.MemoryMB
                CommandLine = $candidate.CommandLine
            }) | Out-Null
            Start-Sleep -Milliseconds 300
        } catch {
            Write-Warning "Kunne ikke stoppe PID $($candidate.Id): $($_.Exception.Message)"
        }
    }

    $afterRows = Get-NodeSnapshot
    return [pscustomobject]@{
        BeforeMb = $totalBefore
        AfterMb = Get-TotalNodeMemoryMb $afterRows
        ThresholdMb = $Threshold
        Killed = $killed
        Remaining = $afterRows
    }
}

function Get-StatePayload {
    param(
        [array]$Rows,
        [array]$PortOwners,
        [double]$TotalMb,
        $CleanupResult,
        [int]$Threshold
    )

    return [pscustomobject]@{
        thresholdMb = $Threshold
        totalNodeMemoryMb = $TotalMb
        overThreshold = $TotalMb -gt $Threshold
        port3000Owners = @($PortOwners)
        cleanup = $CleanupResult
        processes = @(
            $Rows | ForEach-Object {
                [pscustomobject]@{
                    id = $_.Id
                    processName = $_.ProcessName
                    memoryMb = $_.MemoryMB
                    cpu = $_.Cpu
                    repoProcess = $_.RepoProcess
                    heavyProcess = $_.HeavyProcess
                    commandLine = $_.CommandLine
                }
            }
        )
    }
}

$rows = Get-NodeSnapshot
$portOwners = Get-Port3000Owners
$totalMb = Get-TotalNodeMemoryMb $rows
$cleanupResult = $null

if ($Cleanup -and $totalMb -gt $ThresholdMb) {
    $cleanupResult = Cleanup-NodeProcesses -Rows $rows -Threshold $ThresholdMb
    $rows = $cleanupResult.Remaining
    $totalMb = $cleanupResult.AfterMb
    $portOwners = Get-Port3000Owners
}

if ($Watch) {
    Write-Host "Watching Node memory. Threshold: $ThresholdMb MB. Interval: $IntervalSec sec." -ForegroundColor Cyan
    while ($true) {
        $rows = Get-NodeSnapshot
        $portOwners = Get-Port3000Owners
        $totalMb = Get-TotalNodeMemoryMb $rows
        $cleanupResult = $null

        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] Total Node memory: $totalMb MB"

        if ($totalMb -gt $ThresholdMb) {
            Write-Warning "Threshold exceeded. Stopping repo-owned node processes."
            $cleanupResult = Cleanup-NodeProcesses -Rows $rows -Threshold $ThresholdMb
            $rows = $cleanupResult.Remaining
            $totalMb = $cleanupResult.AfterMb
            Write-Host "[$timestamp] After cleanup: $totalMb MB"
        }

        Start-Sleep -Seconds $IntervalSec
    }
}

if ($Json) {
    $payload = Get-StatePayload -Rows $rows -PortOwners $portOwners -TotalMb $totalMb -CleanupResult $cleanupResult -Threshold $ThresholdMb
    $payload | ConvertTo-Json -Depth 6
    if ($totalMb -gt $ThresholdMb) { exit 2 }
    exit 0
}

Write-Host "=== Node.js Processes ===" -ForegroundColor Cyan
if ($rows.Count -eq 0) {
    Write-Host "No node.exe processes found."
} else {
    $rows |
        Select-Object Id, ProcessName, MemoryMB, Cpu, RepoProcess, HeavyProcess, @{N='CommandLine';E={ Format-CommandLine $_.CommandLine }} |
        Format-Table -AutoSize
}

Write-Host "`n=== Port 3000 Listener ===" -ForegroundColor Cyan
if ($portOwners.Count -eq 0) {
    Write-Host "No listener on port 3000."
} else {
    Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
        Select-Object LocalAddress, LocalPort, OwningProcess |
        Format-Table -AutoSize
}

Write-Host "`n=== Total Node Memory ===" -ForegroundColor Cyan
Write-Host "Total: $totalMb MB"
Write-Host "Threshold: $ThresholdMb MB"

if ($cleanupResult) {
    Write-Host "`n=== Cleanup Result ===" -ForegroundColor Cyan
    if ($cleanupResult.Killed.Count -eq 0) {
        Write-Host "No repo-owned node processes were stopped."
    } else {
        $cleanupResult.Killed |
            Select-Object Id, MemoryMB, @{N='CommandLine';E={ Format-CommandLine $_.CommandLine }} |
            Format-Table -AutoSize
    }
    Write-Host "After cleanup: $($cleanupResult.AfterMb) MB"
}

if ($totalMb -gt $ThresholdMb) {
    Write-Warning "Node memory is above threshold."
    exit 2
}

exit 0
