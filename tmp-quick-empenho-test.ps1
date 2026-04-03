$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
try {
  $loginBody = @{ login='adm'; senha='Singem@12345' } | ConvertTo-Json
  $loginResp = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody
  $token = $loginResp.data.accessToken
  if (-not $token) { throw 'Login sem accessToken no retorno.' }

  $numero = 'EMP-' + (Get-Date -Format 'yyyyMMddHHmmss')
  $payloadObj = @{
    numero = $numero
    fornecedor = 'Fornecedor Teste Rapido'
    cnpjFornecedor = '12345678000195'
    valorTotal = 199.90
    itens = @(
      @{
        descricao = 'Item único teste'
        quantidade = 1
        valor_unitario = 199.90
        unidade = 'UN'
      }
    )
  }
  $payload = $payloadObj | ConvertTo-Json -Depth 8

  $resp = Invoke-WebRequest -Uri "$base/api/empenhos" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $payload
  Write-Output ("LOGIN:OK")
  Write-Output ("EMPENHO_STATUS:{0}" -f [int]$resp.StatusCode)
  $content = $resp.Content
  if ($content.Length -gt 700) { $content = $content.Substring(0,700) + ' ...[truncado]' }
  Write-Output "EMPENHO_BODY:$content"
  if ($resp.Content -match 'itens') { Write-Output 'ITENS_MENTION:YES' } else { Write-Output 'ITENS_MENTION:NO' }
}
catch {
  Write-Output ("ERROR:{0}" -f $_.Exception.Message)
  if ($_.ErrorDetails.Message) {
    $errBody = $_.ErrorDetails.Message
    if ($errBody.Length -gt 700) { $errBody = $errBody.Substring(0,700) + ' ...[truncado]' }
    Write-Output "ERROR_BODY:$errBody"
    if ($_.ErrorDetails.Message -match 'coluna.*itens|column.*itens|\"itens\"') { Write-Output 'ITENS_COLUMN_ERROR:SIM' } else { Write-Output 'ITENS_COLUMN_ERROR:NAO_IDENTIFICADO' }
  }
  exit 1
}
