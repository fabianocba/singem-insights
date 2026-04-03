$ErrorActionPreference = 'Stop'

$nonce = Get-Random -Minimum 100000 -Maximum 999999
$empNumero = "9$nonce"
$nfNumero = "7$nonce"

$empInsert = "INSERT INTO empenhos (numero, ano, slug, fornecedor, cnpj_fornecedor, valor_total, status_validacao, modo_registro) VALUES ('$empNumero', 2026, '2026-NE-$empNumero', 'Fornecedor Teste', '12345678000199', 10.50, 'rascunho', 'simulado') RETURNING id;"
$empOut = docker exec singem-dev-postgres-1 psql -U adm -d singem -q -t -A -c $empInsert
$empId = ([regex]::Match(($empOut -join " `n"), '\d+')).Value

$nfInsert = "INSERT INTO notas_fiscais (numero, serie, fornecedor, cnpj_fornecedor, valor_total, status, modo_registro, empenho_id) VALUES ('$nfNumero', '1', 'Fornecedor Teste', '12345678000199', 20.00, 'pendente', 'simulado', $empId) RETURNING id;"
$nfOut = docker exec singem-dev-postgres-1 psql -U adm -d singem -q -t -A -c $nfInsert
$nfId = ([regex]::Match(($nfOut -join " `n"), '\d+')).Value

Write-Host "SEED_EMPENHO_ID:$empId"
Write-Host "SEED_NF_ID:$nfId"

$base = 'http://localhost:3000'
$loginBody = [System.Text.Encoding]::UTF8.GetBytes('{"login":"adm","senha":"Singem@12345"}')
$login = Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -Body $loginBody -ContentType 'application/json' -UseBasicParsing -TimeoutSec 15
$token = ($login.Content | ConvertFrom-Json).data.accessToken
$headers = @{ Authorization = "Bearer $token" }
Write-Host "LOGIN:$($login.StatusCode)"

$testFile = 'C:\SINGEM\storage\temp\smoke-arquivo.txt'
New-Item -ItemType Directory -Force -Path (Split-Path $testFile) | Out-Null
Set-Content -Path $testFile -Value 'SINGEM smoke arquivo' -Encoding UTF8

$upEmpRaw = curl.exe -s -X POST "$base/api/empenhos/$empId/arquivos/upload" -H "Authorization: Bearer $token" -F "file=@$testFile;type=text/plain" -F "categoria=pdf"
$upEmpObj = $upEmpRaw | ConvertFrom-Json
$empArqId = $upEmpObj.data.id
Write-Host "UPLOAD_EMP:201 ARQ=$empArqId"

$upNfRaw = curl.exe -s -X POST "$base/api/notas-fiscais/$nfId/arquivos/upload" -H "Authorization: Bearer $token" -F "file=@$testFile;type=text/plain" -F "categoria=anexo"
$upNfObj = $upNfRaw | ConvertFrom-Json
$nfArqId = $upNfObj.data.id
Write-Host "UPLOAD_NF:201 ARQ=$nfArqId"

$listEmp = Invoke-WebRequest -Uri "$base/api/empenhos/$empId/arquivos" -Headers $headers -UseBasicParsing -TimeoutSec 15
$listEmpObj = $listEmp.Content | ConvertFrom-Json
$listEmpCount = ($listEmpObj.data | Measure-Object).Count
$empArqId = $listEmpObj.data[0].id
Write-Host "LIST_EMP:$($listEmp.StatusCode) COUNT=$listEmpCount"

$listNf = Invoke-WebRequest -Uri "$base/api/notas-fiscais/$nfId/arquivos" -Headers $headers -UseBasicParsing -TimeoutSec 15
$listNfObj = $listNf.Content | ConvertFrom-Json
$listNfCount = ($listNfObj.data | Measure-Object).Count
$nfArqId = $listNfObj.data[0].id
Write-Host "LIST_NF:$($listNf.StatusCode) COUNT=$listNfCount"

$downEmp = Invoke-WebRequest -Uri "$base/api/empenhos/$empId/arquivos/$empArqId/download" -Headers $headers -UseBasicParsing -TimeoutSec 20
Write-Host "DOWNLOAD_EMP:$($downEmp.StatusCode) BYTES=$($downEmp.RawContentLength)"

$downNf = Invoke-WebRequest -Uri "$base/api/notas-fiscais/$nfId/arquivos/$nfArqId/download" -Headers $headers -UseBasicParsing -TimeoutSec 20
Write-Host "DOWNLOAD_NF:$($downNf.StatusCode) BYTES=$($downNf.RawContentLength)"
