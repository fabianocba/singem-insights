$ErrorActionPreference = 'Stop'
Set-Location C:\SINGEM

$insertOutput = docker exec singem-dev-postgres-1 psql -U adm -d singem -c "INSERT INTO _migrations (id) VALUES ('013_storage_persistencia') ON CONFLICT (id) DO NOTHING;"
$selectOutput = docker exec singem-dev-postgres-1 psql -U adm -d singem -c "SELECT id FROM _migrations WHERE id='013_storage_persistencia';"

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers,
    [object]$Body,
    [hashtable]$Form,
    [string]$OutFile
  )

  $params = @{ Method = $Method; Uri = $Url; SkipHttpErrorCheck = $true }
  if ($Headers) { $params.Headers = $Headers }
  if ($null -ne $Body) {
    $params.ContentType = 'application/json'
    $params.Body = ($Body | ConvertTo-Json -Depth 20 -Compress)
  }
  if ($Form) { $params.Form = $Form }
  if ($OutFile) { $params.OutFile = $OutFile }

  $resp = Invoke-WebRequest @params
  $content = if ($OutFile) { '' } else { [string]$resp.Content }
  $json = $null
  if ($content) {
    try { $json = $content | ConvertFrom-Json -Depth 30 } catch {}
  }

  [pscustomobject]@{ StatusCode = [int]$resp.StatusCode; Content = $content; Json = $json; ContentType = [string]$resp.Headers.'Content-Type' }
}

function Find-FirstValue {
  param($Object, [string[]]$Names)
  if ($null -eq $Object) { return $null }

  if ($Object -is [System.Collections.IDictionary]) {
    foreach ($name in $Names) {
      if ($Object.Contains($name) -and $null -ne $Object[$name] -and "$($Object[$name])" -ne '') { return "$($Object[$name])" }
    }
    foreach ($key in $Object.Keys) {
      $found = Find-FirstValue -Object $Object[$key] -Names $Names
      if ($found) { return $found }
    }
    return $null
  }

  if ($Object -is [System.Collections.IEnumerable] -and -not ($Object -is [string])) {
    foreach ($item in $Object) {
      $found = Find-FirstValue -Object $item -Names $Names
      if ($found) { return $found }
    }
    return $null
  }

  $props = $Object.PSObject.Properties
  if ($props) {
    foreach ($name in $Names) {
      $prop = $props[$name]
      if ($prop -and $null -ne $prop.Value -and "$($prop.Value)" -ne '') { return "$($prop.Value)" }
    }
    foreach ($prop in $props) {
      $found = Find-FirstValue -Object $prop.Value -Names $Names
      if ($found) { return $found }
    }
  }
  return $null
}

function Find-FirstArrayCount {
  param($Object)
  if ($null -eq $Object) { return $null }
  if ($Object -is [System.Collections.IEnumerable] -and -not ($Object -is [string])) { return @($Object).Count }
  foreach ($name in 'data','dados','items','rows','result','results') {
    $prop = $Object.PSObject.Properties[$name]
    if ($prop) { return Find-FirstArrayCount -Object $prop.Value }
  }
  return $null
}

$baseUrl = 'http://localhost:3000'
$results = [ordered]@{}

$loginResp = Invoke-Api -Method 'POST' -Url "$baseUrl/api/auth/login" -Body @{ login = 'adm'; senha = 'Singem@12345' }
$token = if ($loginResp.Json) { Find-FirstValue -Object $loginResp.Json -Names @('accessToken','token') } else { $null }
$results.login = [ordered]@{ status = $loginResp.StatusCode; success = [bool](($loginResp.StatusCode -ge 200 -and $loginResp.StatusCode -lt 300) -and $token); tokenFound = [bool]$token; bodySnippet = ($loginResp.Content -replace "`r|`n", ' ') }

$authHeaders = if ($token) { @{ Authorization = "Bearer $token" } } else { @{} }

$empenhosResp = Invoke-Api -Method 'GET' -Url "$baseUrl/api/empenhos" -Headers $authHeaders
$empenhoId = if ($empenhosResp.Json) { Find-FirstValue -Object $empenhosResp.Json -Names @('id') } else { $null }
$results.empenhos = [ordered]@{ status = $empenhosResp.StatusCode; success = ($empenhosResp.StatusCode -ge 200 -and $empenhosResp.StatusCode -lt 300); firstId = $empenhoId; countHint = (Find-FirstArrayCount -Object $empenhosResp.Json); bodySnippet = ($empenhosResp.Content -replace "`r|`n", ' ') }

$notasResp = Invoke-Api -Method 'GET' -Url "$baseUrl/api/notas-fiscais" -Headers $authHeaders
$notaId = if ($notasResp.Json) { Find-FirstValue -Object $notasResp.Json -Names @('id') } else { $null }
$results.notasFiscais = [ordered]@{ status = $notasResp.StatusCode; success = ($notasResp.StatusCode -ge 200 -and $notasResp.StatusCode -lt 300); firstId = $notaId; countHint = (Find-FirstArrayCount -Object $notasResp.Json); bodySnippet = ($notasResp.Content -replace "`r|`n", ' ') }

if ($empenhoId) {
  $empArqsResp = Invoke-Api -Method 'GET' -Url "$baseUrl/api/empenhos/$empenhoId/arquivos" -Headers $authHeaders
  $results.empenhoArquivos = [ordered]@{ status = $empArqsResp.StatusCode; success = ($empArqsResp.StatusCode -ge 200 -and $empArqsResp.StatusCode -lt 300); bodySnippet = ($empArqsResp.Content -replace "`r|`n", ' ') }
} else {
  $results.empenhoArquivos = [ordered]@{ status = $null; success = $false; skipped = $true; reason = 'Nenhum id de empenho encontrado' }
}

if ($notaId) {
  $notaArqsResp = Invoke-Api -Method 'GET' -Url "$baseUrl/api/notas-fiscais/$notaId/arquivos" -Headers $authHeaders
  $results.notaArquivos = [ordered]@{ status = $notaArqsResp.StatusCode; success = ($notaArqsResp.StatusCode -ge 200 -and $notaArqsResp.StatusCode -lt 300); bodySnippet = ($notaArqsResp.Content -replace "`r|`n", ' ') }
} else {
  $results.notaArquivos = [ordered]@{ status = $null; success = $false; skipped = $true; reason = 'Nenhum id de nota fiscal encontrado' }
}

if ($empenhoId) {
  $uploadFile = Join-Path $PWD 'smoke-upload-empenho.txt'
  $downloadFile = Join-Path $PWD 'smoke-download-empenho.txt'
  Set-Content -Path $uploadFile -Value 'smoke upload empenho' -Encoding utf8
  $uploadResp = Invoke-Api -Method 'POST' -Url "$baseUrl/api/empenhos/$empenhoId/arquivos/upload" -Headers $authHeaders -Form @{ file = Get-Item $uploadFile; categoria = 'txt' }
  $arquivoId = if ($uploadResp.Json) { Find-FirstValue -Object $uploadResp.Json -Names @('id') } else { $null }
  $results.empenhoUpload = [ordered]@{ status = $uploadResp.StatusCode; success = [bool](($uploadResp.StatusCode -ge 200 -and $uploadResp.StatusCode -lt 300) -and $arquivoId); arquivoId = $arquivoId; bodySnippet = ($uploadResp.Content -replace "`r|`n", ' ') }

  if ($arquivoId) {
    $downloadResp = Invoke-Api -Method 'GET' -Url "$baseUrl/api/empenhos/$empenhoId/arquivos/$arquivoId/download" -Headers $authHeaders -OutFile $downloadFile
    $downloadedText = if (Test-Path $downloadFile) { Get-Content $downloadFile -Raw } else { '' }
    $results.empenhoDownload = [ordered]@{ status = $downloadResp.StatusCode; success = ($downloadResp.StatusCode -ge 200 -and $downloadResp.StatusCode -lt 300); downloadedBytes = if (Test-Path $downloadFile) { (Get-Item $downloadFile).Length } else { 0 }; contentMatches = ($downloadedText -match 'smoke upload empenho') }
  } else {
    $results.empenhoDownload = [ordered]@{ status = $null; success = $false; skipped = $true; reason = 'Upload não retornou arquivoId' }
  }
} else {
  $results.empenhoUpload = [ordered]@{ status = $null; success = $false; skipped = $true; reason = 'Nenhum id de empenho encontrado' }
  $results.empenhoDownload = [ordered]@{ status = $null; success = $false; skipped = $true; reason = 'Nenhum id de empenho encontrado' }
}

[pscustomobject]@{ migrationInsert = ($insertOutput -join "`n"); migrationSelect = ($selectOutput -join "`n"); results = $results } | ConvertTo-Json -Depth 20
