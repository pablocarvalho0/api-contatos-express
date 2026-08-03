#!/usr/bin/env bash
# test-rotas.sh — smoke test das rotas de contato

BASE="http://localhost:3000"

echo "=== GET todos os contatos ==="
curl -s "$BASE/contacts" | jq

echo "=== GET com id ==="
curl -s "$BASE/contacts/561713e8-4d26-4905-90dc-90e079242693" | jq

echo ""
echo "########## CAMINHOS TRISTES ##########"

echo "=== GET com id inválido (deve dar erro) ==="
curl -s "$BASE/contacts/abc" | jq

echo "=== POST com JSON quebrado ==="
curl -s -w "\n→ HTTP %{http_code}\n" -X POST "$BASE/contacts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":}'

echo "=== POST com email inválido ==="
curl -s -w "\n→ HTTP %{http_code}\n" -X POST "$BASE/contacts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"nao-e-email"}'

echo "=== POST faltando campo obrigatório (sem name) ==="
curl -s -w "\n→ HTTP %{http_code}\n" -X POST "$BASE/contacts" \
  -H "Content-Type: application/json" \
  -d '{"email":"valido@teste.com"}'


echo ""
echo "########## CAMINHO OK NO FUTURO ##########"

echo "=== POST novo contato ==="
curl -s -X POST "$BASE/contacts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Fulano","email":"fulano@teste.com"}' | jq



