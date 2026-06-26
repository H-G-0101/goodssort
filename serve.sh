#!/usr/bin/env bash
# Sobe um servidor local e abre o jogo. Uso: ./serve.sh
cd "$(dirname "$0")"
echo "Servindo em http://localhost:8000  (Ctrl+C para parar)"
python3 -m http.server 8000
