# Installs the Writehand helper app on Windows with its Outlook add-in server, for the current
# user only:
#
#   irm https://github.com/dervisgenc/writehand/releases/latest/download/install-outlook.ps1 | iex
#
# The same as install.ps1 -Outlook, which it fetches from the same release: the helper app is
# checked and installed as for the browsers, then Windows asks once to trust the add-in's local
# certificate and Outlook on the web opens to add the add-in. No administrator rights.
# WRITEHAND_DOWNLOAD_BASE replaces the download address (a URL or, in CI, a local folder).

function Install-WritehandForOutlook {
  $ErrorActionPreference = 'Stop'
  $ProgressPreference = 'SilentlyContinue'
  $base = if ($env:WRITEHAND_DOWNLOAD_BASE) { $env:WRITEHAND_DOWNLOAD_BASE } else { 'https://github.com/dervisgenc/writehand/releases/latest/download' }
  # Windows PowerShell 5.1 may not offer TLS 1.2 by default; GitHub requires it.
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  $script = if ($base -match '^https?://') {
    Invoke-RestMethod -UseBasicParsing -Uri "$base/install.ps1"
  } else {
    Get-Content -Raw -LiteralPath (Join-Path $base 'install.ps1')
  }
  & ([scriptblock]::Create($script)) -Outlook
}

# A function keeps the settings above out of the caller's session when run through iex.
Install-WritehandForOutlook
