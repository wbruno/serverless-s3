# 🐳 Testes Docker para serverless-s3

Este diretório contém arquivos para executar os testes dos exemplos em containers Docker isolados.

## 📁 Arquivos

- `Dockerfile.test` - Imagem Docker para ambiente de testes
- `docker-compose.test.yml` - Configuração dos serviços de teste
- `run-tests-docker.sh` - Script para facilitar execução dos testes
- `.dockerignore` - Arquivos ignorados no build Docker

## 🚀 Como usar

### Executar todos os testes:
```bash
# A partir do diretório raiz do projeto
./example/run-tests-docker.sh
```

### Executar um teste específico:
```bash
./example/run-tests-docker.sh simple_event
```

### Rebuildar e executar:
```bash
# Rebuildar imagem e executar todos os testes
./example/run-tests-docker.sh --build

# Rebuildar e executar teste específico
./example/run-tests-docker.sh simple_event --build
```

## 🔧 Uso direto com Docker Compose

```bash
# Construir imagens
docker-compose -f example/docker-compose.test.yml build

# Executar um teste específico
docker-compose -f example/docker-compose.test.yml run --rm test-simple-event

# Limpar containers
docker-compose -f example/docker-compose.test.yml down --remove-orphans
```

## 📋 Testes disponíveis

- `put_with_s3_event_response`
- `resize_image`
- `simple_event`
- `simple_event_python`
- `simple_put`
- `webpack_support`

## ⚡ Características

- **Isolamento**: Cada teste roda em container separado
- **Paralelismo**: Testes podem rodar simultaneamente
- **Consistência**: Mesmo ambiente em desenvolvimento e CI
- **Limpeza automática**: Containers são removidos após execução
- **Cleanup robusto**: Servidores são parados adequadamente

## 🏗️ Estrutura do Container

- **Base**: Node.js 18 Alpine
- **Dependências**: bash, curl, python3, git
- **Ambiente**: Preparado para serverless framework
- **Working dir**: `/app`
- **Volumes**: Código sincronizado com host
