#!/bin/bash

# Script para testar um exemplo específico do serverless-s3
# Uso: ./test-example.sh <nome-do-exemplo>

set -e

if [ $# -eq 0 ]; then
    echo "Erro: Nome do exemplo é obrigatório"
    echo "Uso: $0 <nome-do-exemplo>"
    echo "Exemplos disponíveis:"
    ls -1 example/ | grep -v package
    exit 1
fi

EXAMPLE_NAME=$1
EXAMPLE_DIR="example/$EXAMPLE_NAME"

if [ ! -d "$EXAMPLE_DIR" ]; then
    echo "Erro: Exemplo '$EXAMPLE_NAME' não encontrado"
    echo "Exemplos disponíveis:"
    ls -1 example/ | grep -v package
    exit 1
fi

echo "Testando exemplo: $EXAMPLE_NAME"
echo "=================================="

# Navegar para o diretório do exemplo
cd "$EXAMPLE_DIR"

# Instalar dependências
echo "Instalando dependências..."
npm install

# Verificar se tem script de start (alguns exemplos podem não ter servidor)
if npm run | grep -q "start"; then
    echo "Iniciando servidor..."
    npm start &
    SERVER_PID=$!
    
    echo "Aguardando servidor iniciar..."
    sleep 10
    
    # Aguardar servidor estar pronto
    echo "Verificando se servidor está pronto..."
    RETRIES=0
    MAX_RETRIES=30
    
    until curl -f http://localhost:3000/dev > /dev/null 2>&1; do
        if [ $RETRIES -ge $MAX_RETRIES ]; then
            echo "Erro: Servidor não iniciou após $MAX_RETRIES tentativas"
            kill $SERVER_PID 2>/dev/null || true
            exit 1
        fi
        echo "Servidor ainda não está pronto, aguardando... (tentativa $((RETRIES + 1))/$MAX_RETRIES)"
        sleep 2
        RETRIES=$((RETRIES + 1))
    done
    
    echo "Servidor está pronto!"
fi

# Executar testes
echo "Executando testes..."
npm test

# Finalizar servidor se foi iniciado
if [ ! -z "$SERVER_PID" ]; then
    echo "Finalizando servidor..."
    kill $SERVER_PID 2>/dev/null || true
fi

echo "Testes do exemplo '$EXAMPLE_NAME' concluídos com sucesso!"
