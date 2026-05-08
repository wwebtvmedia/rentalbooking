#!/bin/bash
# check_emails.sh - Retrieve magic links from local Mailpit

# Check for jq dependency
if ! command -v jq >/dev/null 2>&1; then
    echo "❌ Error: 'jq' is not installed. Please install it with: sudo apt install jq"
    exit 1
fi

echo "📬 Checking local Mailpit for recent Magic Links..."

# Mailpit API is available on localhost:8025
EMAILS=$(curl -s http://localhost:8025/api/v1/messages)

COUNT=$(echo "$EMAILS" | jq '.count')

if [ "$COUNT" -eq "0" ] || [ -z "$COUNT" ]; then
    echo "❌ No emails found in Mailpit (or Mailpit is not reachable)."
    exit 0
fi

echo "✅ Found $COUNT emails. Latest Magic Link:"
echo "--------------------------------------------------"

# Get the latest message ID
LATEST_ID=$(echo "$EMAILS" | jq -r '.messages[0].ID')

# Get the text content of the latest message
CONTENT=$(curl -s "http://localhost:8025/api/v1/message/$LATEST_ID" | jq -r '.Text')

echo "$CONTENT"
echo "--------------------------------------------------"
echo "💡 Copy the link above and paste it into your browser to log in."
