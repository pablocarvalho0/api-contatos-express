#!/usr/bin/env bash
# test-rotas.sh — smoke test das rotas de contato

BASE="http://localhost:3000"

echo "=== GET todos os contatos ==="
curl -s "$BASE/contacts" | jq

echo "=== POST novo contato ==="
curl -s -X POST "$BASE/contacts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Fulano","email":"fulano@teste.com"}' | jq

echo "=== GET com id inválido (deve dar erro) ==="
curl -s "$BASE/contacts/abc" | jq

echo ""
echo "########## CAMINHOS TRISTES ##########"

echo "=== POST com email inválido ==="
curl -s -w "\n→ HTTP %{http_code}\n" -X POST "$BASE/contacts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"nao-e-email"}'

echo "=== POST faltando campo obrigatório (sem name) ==="
curl -s -w "\n→ HTTP %{http_code}\n" -X POST "$BASE/contacts" \
  -H "Content-Type: application/json" \
  -d '{"email":"valido@teste.com"}'

echo "=== POST com JSON quebrado ==="
curl -s -w "\n→ HTTP %{http_code}\n" -X POST "$BASE/contacts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":}'

echo "=== GET id com formato VÁLIDO mas inexistente ==="
curl -s -w "\n→ HTTP %{http_code}\n" \
  "$BASE/contacts/00000000-0000-4000-8000-000000000000"