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