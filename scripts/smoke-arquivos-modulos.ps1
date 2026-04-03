$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'

$loginBody = [System.Text.Encoding]::UTF8.GetBytes('{"login":"adm","senha":"Singem@12345"}')
$login = Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -Body $loginBody -ContentType 'application/json' -UseBasicParsing -TimeoutSec 15
$token = ($login.Content | ConvertFrom-Json).data.accessToken
$headers = @{ Authorization = "Bearer $token" }
Write-Host "LOGIN:$($login.StatusCode)"

$empenhoPayload = '{"numero":"900001","ano":2026,"fornecedor":"Fornecedor Teste","cnpjFornecedor":"12345678000199","valorTotal":10.5,"itens":[]}'
$emp = Invoke-WebRequest -Uri "$base/api/empenhos" -Method POST -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($empenhoPayload)) -ContentType 'application/json' -UseBasicParsing -TimeoutSec 15
$empObj = $emp.Content | ConvertFrom-Json
$empId = $empObj.data.id
Write-Host "CREATE_EMPENHO:$($emp.StatusCode) ID=$empId"

$nfPayload = '{"numero":"700001","serie":"1","fornecedor":"Fornecedor Teste","cnpj_fornecedor":"12345678000199","valor_total":20,"itens":[]}'
$nf = Invoke-WebRequest -Uri "$base/api/notas-fiscais" -Method POST -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($nfPayload)) -ContentType 'application/json' -UseBasicParsing -TimeoutSec 15
$nfObj = $nf.Content | ConvertFrom-Json
$nfId = $nfObj.data.id
Write-Host "CREATE_NF:$($nf.StatusCode) ID=$nfId"

$testFile = 'C:\SINGEM\storage\temp\smoke-arquivo.txt'
New-Item -ItemType Directory -Force -Path (Split-Path $testFile) | Out-Null
Set-Content -Path $testFile -Value 'SINGEM smoke arquivo' -Encoding UTF8

$upEmp = Invoke-WebRequest -Uri "$base/api/empenhos/$empId/arquivos/upload" -Method POST -Headers $headers -Form @{ file = Get-Item $testFile; categoria = 'pdf' } -UseBasicParsing -TimeoutSec 20
$upEmpObj = $upEmp.Content | ConvertFrom-Json
$empArqId = $upEmpObj.data.id
Write-Host "UPLOAD_EMP:$($upEmp.StatusCode) ARQ=$empArqId"

$upNf = Invoke-WebRequest -Uri "$base/api/notas-fiscais/$nfId/arquivos/upload" -Method POST -Headers $headers -Form @{ file = Get-Item $testFile; categoria = 'anexo' } -UseBasicParsing -TimeoutSec 20
$upNfObj = $upNf.Content | ConvertFrom-Json
$nfArqId = $upNfObj.data.id
Write-Host "UPLOAD_NF:$($upNf.StatusCode) ARQ=$nfArqId"

$listEmp = Invoke-WebRequest -Uri "$base/api/empenhos/$empId/arquivos" -Headers $headers -UseBasicParsing -TimeoutSec 15
$listEmpCount = (($listEmp.Content | ConvertFrom-Json).data | Measure-Object).Count
Write-Host "LIST_EMP:$($listEmp.StatusCode) COUNT=$listEmpCount"

$listNf = Invoke-WebRequest -Uri "$base/api/notas-fiscais/$nfId/arquivos" -Headers $headers -UseBasicParsing -TimeoutSec 15
$listNfCount = (($listNf.Content | ConvertFrom-Json).data | Measure-Object).Count
Write-Host "LIST_NF:$($listNf.StatusCode) COUNT=$listNfCount"

$downEmp = Invoke-WebRequest -Uri "$base/api/empenhos/$empId/arquivos/$empArqId/download" -Headers $headers -UseBasicParsing -TimeoutSec 20
Write-Host "DOWNLOAD_EMP:$($downEmp.StatusCode) BYTES=$($downEmp.RawContentLength)"

$downNf = Invoke-WebRequest -Uri "$base/api/notas-fiscais/$nfId/arquivos/$nfArqId/download" -Headers $headers -UseBasicParsing -TimeoutSec 20
Write-Host "DOWNLOAD_NF:$($downNf.StatusCode) BYTES=$($downNf.RawContentLength)"
