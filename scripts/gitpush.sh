#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# 1. Stage all new and modified files in the current directory
echo "Staging all changes..."
git add .

# 2. Prompt the user for a commit message
read -p "Enter commit message: " commit_message

# Check if the commit message is empty
if [ -z "$commit_message" ]; then
  echo "Commit message cannot be empty. Aborting."
  exit 1
fi

# 3. Commit the changes with the provided message
echo "Committing with message: \"$commit_message\""
git commit -m "$commit_message"

# 4. Push the commit to the remote repository
echo "Pushing to remote..."
git push

echo "✅ Push complete!"