# Installs the Writehand helper app on Windows, for the current user only.
#
#   Install:    irm https://github.com/dervisgenc/writehand/releases/latest/download/install.ps1 | iex
#   Outlook:    irm https://github.com/dervisgenc/writehand/releases/latest/download/install-outlook.ps1 | iex
#   Uninstall:  & ([scriptblock]::Create((irm https://github.com/dervisgenc/writehand/releases/latest/download/install.ps1))) -Uninstall
#
# With `irm | iex`, an extension ID can be passed as $env:WRITEHAND_EXTENSION_ID. The script
# downloads the program and the release's SHA256SUMS, stops unless the SHA-256 matches, unpacks
# the program into a temporary folder and lets it install itself into
# %LOCALAPPDATA%\Programs\writehand. No administrator rights.
# -Outlook (what install-outlook.ps1 passes) also turns on the Outlook add-in server, as
# `writehand outlook enable` does: Windows asks once to trust its local certificate.
# WRITEHAND_DOWNLOAD_BASE replaces the download address (a URL or, in CI, a local folder).
param(
  [string] $ExtensionId = $env:WRITEHAND_EXTENSION_ID,
  [switch] $Outlook,
  [switch] $Uninstall,
  [switch] $DeleteData
)

function Install-WritehandHelper {
  $ErrorActionPreference = 'Stop'
  # The download progress bar slows Windows PowerShell 5.1 down considerably.
  $ProgressPreference = 'SilentlyContinue'
  $base = if ($env:WRITEHAND_DOWNLOAD_BASE) { $env:WRITEHAND_DOWNLOAD_BASE } else { 'https://github.com/dervisgenc/writehand/releases/latest/download' }
  $installed = Join-Path $env:LOCALAPPDATA 'Programs\writehand\writehand.exe'

  # Removal needs no download: the installed program removes itself and its registrations.
  if ($Uninstall) {
    if (-not (Test-Path -LiteralPath $installed)) { throw "The helper app is not installed ($installed not found)." }
    $arguments = @('uninstall')
    if ($DeleteData) { $arguments += '--delete-data' }
    & $installed @arguments
    if ($LASTEXITCODE -ne 0) { throw "Uninstalling failed (exit code $LASTEXITCODE)." }
    return
  }

  if (-not [Environment]::Is64BitOperatingSystem) { throw 'Writehand needs 64-bit Windows.' }
  # Windows on Arm runs the x64 program through its built-in emulation.
  $archive = 'writehand-windows-x64.zip'
  # Windows PowerShell 5.1 may not offer TLS 1.2 by default; GitHub requires it.
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

  $temporary = Join-Path ([IO.Path]::GetTempPath()) ("writehand-" + [guid]::NewGuid())
  New-Item -ItemType Directory -Path $temporary | Out-Null
  try {
    foreach ($name in @($archive, 'SHA256SUMS')) {
      $target = Join-Path $temporary $name
      if ($base -match '^https?://') {
        Write-Host "Downloading $name..."
        Invoke-WebRequest -UseBasicParsing -Uri "$base/$name" -OutFile $target
      } else {
        Copy-Item -LiteralPath (Join-Path $base $name) -Destination $target
      }
    }

    # Each SHA256SUMS line is "<sha256>  <file name>".
    $expected = Get-Content -LiteralPath (Join-Path $temporary 'SHA256SUMS') |
      Where-Object { ($_ -split '\s+', 2)[1] -in @($archive, "*$archive") } |
      ForEach-Object { ($_ -split '\s+')[0] } |
      Select-Object -First 1
    if (-not $expected) { throw "SHA256SUMS lists no checksum for $archive." }
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $temporary $archive)).Hash
    if ($actual -ne $expected) { throw "The checksum of $archive does not match SHA256SUMS. Nothing was installed." }

    Expand-Archive -LiteralPath (Join-Path $temporary $archive) -DestinationPath $temporary
    # The program copies itself into place and registers itself with the browsers.
    $arguments = @('install')
    if ($ExtensionId) { $arguments += "--extension-id=$ExtensionId" }
    if ($Outlook) { $arguments += '--outlook' }
    & (Join-Path $temporary 'writehand.exe') @arguments
    if ($LASTEXITCODE -ne 0) { throw "Installing failed (exit code $LASTEXITCODE)." }
  } finally {
    Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue
  }
}

# A function keeps the settings above out of the caller's session when run through iex.
Install-WritehandHelper
