#!/bin/bash

# Bump version in package.json
npm version patch --no-git-tag-version

# Stage all changes
git add .

# Commit with the provided message
git commit -m "asd"

# Push changes
git push

# Publish to npm
npm publish
