#!/bin/bash

# Script para executar testes em containers Docker
# Uso: ./run-tests-docker.sh [exemplo] [--build]
# NOTA: Execute este script a partir do diretório raiz do projeto

set -e

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script a partir do diretório raiz do projeto"
    echo "   Exemplo: ./example/run-tests-docker.sh"
    exit 1
fi

EXAMPLE_NAME=$1
BUILD_FLAG=$2

# Função para mostrar ajuda
show_help() {
    echo "Uso: ./example/run-tests-docker.sh [exemplo] [--build]"
    echo "     (Execute a partir do diretório raiz do projeto)"
    echo ""
    echo "Opções:"
    echo "  [exemplo]     Nome do exemplo para testar (opcional)"
    echo "  --build       Rebuildar a imagem Docker antes de executar"
    echo ""
    echo "Exemplos disponíveis:"
    echo "  - put_with_s3_event_response"
    echo "  - resize_image"
    echo "  - simple_event"
    echo "  - simple_event_python"
    echo "  - simple_put"
    echo "  - webpack_support"
    echo ""
    echo "Exemplos de uso:"
    echo "  ./example/run-tests-docker.sh                              # Executar todos os testes"
    echo "  ./example/run-tests-docker.sh simple_event                # Executar apenas o teste simple_event"
    echo "  ./example/run-tests-docker.sh simple_event --build        # Rebuildar e executar o teste simple_event"
    echo "  ./example/run-tests-docker.sh --build                     # Rebuildar e executar todos os testes"
}

# Verificar se é solicitação de ajuda
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# Verificar se --build foi passado como primeiro argumento
if [ "$1" = "--build" ]; then
    BUILD_FLAG="--build"
    EXAMPLE_NAME=""
fi

echo "🐳 Executando testes com Docker..."

# Construir imagem se solicitado
if [ "$BUILD_FLAG" = "--build" ]; then
    echo "🔨 Construindo imagem Docker..."
    docker-compose -f example/docker-compose.test.yml build
fi

# Se um exemplo específico foi fornecido
if [ ! -z "$EXAMPLE_NAME" ]; then
    SERVICE_NAME="test-$(echo $EXAMPLE_NAME | tr '_' '-')"
    
    echo "🚀 Executando teste: $EXAMPLE_NAME"
    docker-compose -f example/docker-compose.test.yml run --rm $SERVICE_NAME
else
    echo "🚀 Executando todos os testes..."
    
    # Lista de todos os serviços de teste
    SERVICES=(
        "test-put-with-s3-event-response"
        "test-resize-image"
        "test-simple-event"
        "test-simple-event-python"
        "test-simple-put"
        "test-webpack-support"
    )
    
    # Executar cada teste
    for service in "${SERVICES[@]}"; do
        echo ""
        echo "📋 Executando $service..."
        if ! docker-compose -f example/docker-compose.test.yml run --rm $service; then
            echo "❌ Falha no teste: $service"
            exit 1
        fi
        echo "✅ Sucesso: $service"
    done
    
    echo ""
    echo "🎉 Todos os testes foram executados com sucesso!"
fi

# Limpeza
echo "🧹 Limpando containers..."
docker-compose -f example/docker-compose.test.yml down --remove-orphans

echo "✨ Concluído!"
