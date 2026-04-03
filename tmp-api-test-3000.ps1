$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
try {
  $login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body (@{ login='admin'; senha='MudarNaPrimeiraExecucao123!' } | ConvertTo-Json)
  $token = $login.data.accessToken
  $numero = 'EMP-' + (Get-Date -Format 'yyyyMMddHHmmss')
  $payload = @{ numero=$numero; fornecedor='Fornecedor Teste API'; cnpjFornecedor='12345678000195'; valorTotal=150.75; itens=@(@{ descricao='Item teste'; quantidade=3; valor_unitario=50.25 }) } | ConvertTo-Json -Depth 6
  $resp = Invoke-WebRequest -Uri "$base/api/empenhos" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $payload
  Write-Output ("STATUS:{0}" -f [int]$resp.StatusCode)
  Write-Output 'BODY:'
  Write-Output $resp.Content
}
catch {
  Write-Output ("ERROR:{0}" -f $_.Exception.Message)
  if ($_.ErrorDetails.Message) { Write-Output 'BODY:'; Write-Output $_.ErrorDetails.Message }
  exit 1
}
