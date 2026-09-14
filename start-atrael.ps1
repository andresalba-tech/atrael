$ErrorActionPreference = "Stop"

# ==================================================
# ATRAEL DESKTOP LAUNCHER
# ==================================================

$root = "C:\Mine\Programas\ollama\Atrael"

$backendPath = Join-Path $root "backend"
$frontendPath = Join-Path $root "frontend"

$backendPort = 3050
$frontendPort = 5180

$browserProfile = Join-Path $env:TEMP "AtraelBrowser"

$backend = $null
$frontend = $null


# ==================================================
# HELPERS
# ==================================================

function Stop-ProcessTree {
    param(
        [System.Diagnostics.Process]$Process
    )

    if ($null -eq $Process) {
        return
    }

    try {
        $running =
            Get-Process `
                -Id $Process.Id `
                -ErrorAction SilentlyContinue

        if ($null -ne $running) {
            taskkill `
                /PID $Process.Id `
                /T `
                /F `
                2>$null |
                Out-Null
        }
    }
    catch {
        # Ignore shutdown errors.
    }
}


function Get-AtraelBrowserProcesses {

    Get-CimInstance Win32_Process |
        Where-Object {

            (
                $_.Name -eq "msedge.exe" -or
                $_.Name -eq "chrome.exe"
            ) -and

            $_.CommandLine -and

            $_.CommandLine.Contains(
                "AtraelBrowser"
            )
        }
}


function Test-AtraelWindowOpen {

    $browserProcesses =
        Get-AtraelBrowserProcesses

    foreach ($browserInfo in $browserProcesses) {

        try {
            $process =
                Get-Process `
                    -Id $browserInfo.ProcessId `
                    -ErrorAction Stop

            if ($process.MainWindowHandle -ne 0) {
                return $true
            }
        }
        catch {
            # Process disappeared while checking.
        }
    }

    return $false
}


function Stop-AtraelBrowser {

    $browserProcesses =
        Get-AtraelBrowserProcesses

    foreach ($browserInfo in $browserProcesses) {

        try {
            taskkill `
                /PID $browserInfo.ProcessId `
                /T `
                /F `
                2>$null |
                Out-Null
        }
        catch {
            # Already closed.
        }
    }
}


function Stop-PortProcess {
    param(
        [int]$Port
    )

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            if ($conn.OwningProcess -gt 0) {
                taskkill /PID $conn.OwningProcess /F 2>$null | Out-Null
            }
        }
    }
    catch {
        # Ignore port cleanup errors.
    }
}


function Show-AtraelError {
    param(
        [string]$Message
    )

    try {
        Add-Type `
            -AssemblyName PresentationFramework `
            -ErrorAction SilentlyContinue

        [System.Windows.MessageBox]::Show(
            $Message,
            "Atrael",
            "OK",
            "Error"
        ) |
            Out-Null
    }
    catch {
    }
}


# ==================================================
# START ATRAEL
# ==================================================

try {

    Write-Host ""
    Write-Host "Starting Atrael..."
    Write-Host ""


    # --------------------------------------------------
    # CLEAN OLD ATRAEL BROWSER & PORT PROCESSES
    # --------------------------------------------------

    Stop-AtraelBrowser
    Stop-PortProcess -Port $backendPort
    Stop-PortProcess -Port $frontendPort


    # --------------------------------------------------
    # START BACKEND
    # --------------------------------------------------

    $backend =
        Start-Process `
            -FilePath "node.exe" `
            -ArgumentList "server.js" `
            -WorkingDirectory $backendPath `
            -WindowStyle Hidden `
            -PassThru


    Write-Host "Backend started."
    Write-Host "Backend PID: $($backend.Id)"


    # --------------------------------------------------
    # WAIT FOR BACKEND
    # --------------------------------------------------

    Write-Host "Waiting for backend..."

    $backendReady = $false

    for ($i = 0; $i -lt 40; $i++) {

        if ($backend.HasExited) {
            throw "Atrael backend stopped during startup."
        }

        try {

            $response =
                Invoke-WebRequest `
                    -Uri "http://127.0.0.1:$backendPort/api/health" `
                    -UseBasicParsing `
                    -TimeoutSec 1

            if ($response.StatusCode -eq 200) {
                $backendReady = $true
                break
            }
        }
        catch {
        }

        Start-Sleep -Milliseconds 500
    }


    if (-not $backendReady) {
        throw "Atrael backend did not start correctly."
    }


    Write-Host "Backend ready."


    # --------------------------------------------------
    # START FRONTEND
    # --------------------------------------------------

    $frontend =
        Start-Process `
            -FilePath "cmd.exe" `
            -ArgumentList @(
                "/k",
                "npm run dev -- --host 127.0.0.1 --port $frontendPort --strictPort"
            ) `
            -WorkingDirectory $frontendPath `
            -WindowStyle Hidden `
            -PassThru

    Write-Host "Frontend started."
    Write-Host "Frontend PID: $($frontend.Id)"


    # --------------------------------------------------
    # WAIT FOR FRONTEND
    # --------------------------------------------------

    Write-Host "Waiting for frontend..."

    $frontendReady = $false

    for ($i = 0; $i -lt 40; $i++) {

        if ($frontend.HasExited) {
            throw "Atrael frontend stopped during startup."
        }

        try {

            $response =
                Invoke-WebRequest `
                    -Uri "http://127.0.0.1:$frontendPort" `
                    -UseBasicParsing `
                    -TimeoutSec 1

            if ($response.StatusCode -eq 200) {
                $frontendReady = $true
                break
            }
        }
        catch {
        }

        Start-Sleep -Milliseconds 500
    }


    if (-not $frontendReady) {
        throw "Atrael frontend did not start correctly."
    }


    Write-Host "Frontend ready."


    # --------------------------------------------------
    # FIND EDGE OR CHROME
    # --------------------------------------------------

    $browserCandidates = @(

        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",

        "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",

        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",

        "${env:LocalAppData}\Google\Chrome\Application\chrome.exe"
    )


    $browser =
        $browserCandidates |
        Where-Object {
            Test-Path $_
        } |
        Select-Object -First 1


    if (-not $browser) {
        throw "Microsoft Edge or Google Chrome was not found."
    }


    # --------------------------------------------------
    # OPEN ATRAEL
    # --------------------------------------------------

    Write-Host "Opening Atrael..."


    Start-Process `
        -FilePath $browser `
        -ArgumentList @(
            "--app=http://127.0.0.1:$frontendPort",
            "--user-data-dir=$browserProfile",
            "--disable-background-mode",
            "--no-first-run"
        )


    # --------------------------------------------------
    # WAIT FOR WINDOW TO EXIST
    # --------------------------------------------------

    $windowFound = $false

    for ($i = 0; $i -lt 40; $i++) {

        if (Test-AtraelWindowOpen) {
            $windowFound = $true
            break
        }

        Start-Sleep -Milliseconds 500
    }


    if (-not $windowFound) {
        throw "The Atrael window did not open."
    }


    Write-Host "Atrael is running."


    # --------------------------------------------------
    # WAIT UNTIL USER CLOSES ATRAEL WINDOW
    # --------------------------------------------------

    while ($true) {

        if (-not (Test-AtraelWindowOpen)) {
            break
        }


        if ($backend.HasExited) {
            throw "Atrael backend stopped unexpectedly."
        }


        if ($frontend.HasExited) {
            throw "Atrael frontend stopped unexpectedly."
        }


        Start-Sleep -Milliseconds 750
    }


    Write-Host "Atrael window closed."
}
catch {

    $message =
        $_.Exception.Message

    Write-Host ""
    Write-Host "Atrael error:"
    Write-Host $message
    Write-Host ""

    Show-AtraelError $message
}
finally {

    # ==================================================
    # ALWAYS CLEAN EVERYTHING UP
    # ==================================================

    Write-Host "Closing Atrael..."


    # Kill remaining Edge/Chrome processes belonging
    # specifically to the Atrael browser profile.

    Stop-AtraelBrowser


    # Kill Vite + child process tree.

    Stop-ProcessTree $frontend


    # Kill Atrael backend.

    Stop-ProcessTree $backend


    Write-Host "Atrael stopped."
}