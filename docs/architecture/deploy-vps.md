# Deploy VPS

Comando oficial:

pwsh -File .\\scripts\\deploy.ps1 -ProjectRoot .

Etapas:

1. Validar compose prod e env.
2. Build e up da stack.
3. Rodar healthchecks.
4. Exibir status dos serviços.
