#!/bin/bash
# DEPLOYMENT SCRIPT

echo "Building React App..."
npm run build

echo "Cleaning old public folder..."
rm -rf server/public
mkdir -p server/public

echo "Moving build to server/public..."
cp -R dist/* server/public/

echo "Done! The 'server' folder is ready."
