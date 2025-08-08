TARGET=$1
npx yarn --cwd /src install
npx yarn --cwd /src workspace ${TARGET} install
npx yarn --cwd /src workspace ${TARGET} run start &
/src/docker/wait-for-it.sh  -t 60 localhost:3000 -- npx yarn --cwd /src workspace ${TARGET} run test
