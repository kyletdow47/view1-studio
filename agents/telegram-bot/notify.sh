#!/bin/bash

set -e

VERBOSE=false

# Parse options
while [[ "$1" == -* ]]; do
    case "$1" in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            break
            ;;
    esac
done

TITLE="${1:-}"
MESSAGE="${2:-}"
PRIORITY="${3:-info}"

# Emoji mapping for priority levels
declare -A EMOJI_MAP=(
    [info]="ℹ️"
    [success]="✅"
    [warning]="⚠️"
    [urgent]="🚨"
    [error]="❌"
)

# Validate arguments
if [[ -z "$TITLE" || -z "$MESSAGE" ]]; then
    if [[ "$VERBOSE" == true ]]; then
        echo "Error: Missing required arguments" >&2
        echo "Usage: $(basename "$0") [-v] \"Title\" \"Message body\" \"priority\"" >&2
        echo "Priority levels: info, success, warning, urgent, error" >&2
    fi
    exit 1
fi

# Validate priority
if [[ ! " ${!EMOJI_MAP[@]} " =~ " ${PRIORITY} " ]]; then
    if [[ "$VERBOSE" == true ]]; then
        echo "Error: Invalid priority level '$PRIORITY'" >&2
        echo "Valid options: ${!EMOJI_MAP[@]}" >&2
    fi
    exit 1
fi

# Get emoji for priority
EMOJI="${EMOJI_MAP[$PRIORITY]}"

# Load credentials from .env file
ENV_FILE="$HOME/view1-studio/agents/telegram-bot/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    if [[ "$VERBOSE" == true ]]; then
        echo "Error: Environment file not found at $ENV_FILE" >&2
    fi
    exit 1
fi

# Source the .env file safely (only load TELEGRAM_* variables)
set +e
# shellcheck source=/dev/null
source <(grep -E '^TELEGRAM_(BOT_TOKEN|CHAT_ID)=' "$ENV_FILE")
set -e

if [[ -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_CHAT_ID" ]]; then
    if [[ "$VERBOSE" == true ]]; then
        echo "Error: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in $ENV_FILE" >&2
    fi
    exit 1
fi

# Format the message
FORMATTED_MESSAGE="${EMOJI} *${TITLE}*
${MESSAGE}"

# Send to Telegram
API_URL="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage"

CURL_OPTS=(
    --silent
    --show-error
    --max-time 10
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}"
    --data-urlencode "text=${FORMATTED_MESSAGE}"
    --data-urlencode "parse_mode=Markdown"
)

if [[ "$VERBOSE" == true ]]; then
    CURL_OPTS=(--silent --show-error --max-time 10)
    RESPONSE=$(curl \
        -X POST \
        "${CURL_OPTS[@]}" \
        --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
        --data-urlencode "text=${FORMATTED_MESSAGE}" \
        --data-urlencode "parse_mode=Markdown" \
        "$API_URL" 2>&1)
    CURL_EXIT=$?
    echo "Response: $RESPONSE" >&2
else
    RESPONSE=$(curl \
        -X POST \
        "${CURL_OPTS[@]}" \
        "$API_URL" 2>&1)
    CURL_EXIT=$?
fi

if [[ $CURL_EXIT -ne 0 ]]; then
    if [[ "$VERBOSE" == true ]]; then
        echo "Error: Failed to send Telegram notification (curl exit code: $CURL_EXIT)" >&2
    fi
    exit 1
fi

# Check if Telegram API returned an error
if echo "$RESPONSE" | grep -q '"ok":false'; then
    if [[ "$VERBOSE" == true ]]; then
        echo "Error: Telegram API error: $RESPONSE" >&2
    fi
    exit 1
fi

exit 0
