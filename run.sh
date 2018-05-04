#!/bin/bash
clear
echo "The following node processes were found and will be killed:"
lsof -i :3980
kill -9 $(lsof -sTCP:LISTEN -i:3980 -t)

#echo "Removing node modules folder and installing latest"
#rm -rf node_modules
#npm install

echo "Run the server"
nodemon lib/server.js