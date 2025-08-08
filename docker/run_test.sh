TARGET=$1
npx yarn --cwd /src install
npx yarn --cwd /src workspace ${TARGET} install
npx yarn --cwd /src workspace ${TARGET} run start &
/src/docker/wait-for-it.sh  -t 600 localhost:3000 -- npx yarn --cwd /src workspace ${TARGET} run test
