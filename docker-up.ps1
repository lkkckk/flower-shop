[CmdletBinding()]
param(
  [switch]$NoBuild
)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$localEnvPath = Join-Path $projectDirectory '.env'
$previousPassword = $env:FLOWER_DB_PASSWORD
$previousEncodedPassword = $env:FLOWER_DB_PASSWORD_URL

try {
  if (Test-Path -LiteralPath $localEnvPath) {
    $databaseLine = Get-Content -LiteralPath $localEnvPath |
      Where-Object { $_ -match '^DATABASE_URL=' } |
      Select-Object -First 1

    if ($databaseLine) {
      $databaseUrl = $databaseLine.Substring($databaseLine.IndexOf('=') + 1).Trim('"')
      $databaseUri = [Uri]$databaseUrl
      $credentials = [Uri]::UnescapeDataString($databaseUri.UserInfo).Split(':', 2)
      if ($credentials.Count -eq 2 -and $credentials[1]) {
        $env:FLOWER_DB_PASSWORD = $credentials[1]
        $env:FLOWER_DB_PASSWORD_URL = [Uri]::EscapeDataString($credentials[1])
      }
    }
  }

  $arguments = @('compose', 'up', '-d')
  if (-not $NoBuild) { $arguments += '--build' }
  & docker @arguments
  if ($LASTEXITCODE -ne 0) { throw "docker compose up failed with exit code $LASTEXITCODE" }
} finally {
  $env:FLOWER_DB_PASSWORD = $previousPassword
  $env:FLOWER_DB_PASSWORD_URL = $previousEncodedPassword
}

