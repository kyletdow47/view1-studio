#!/bin/bash

set -e

AGENT_ID="${1:-}"
TASK_FILE="${2:-}"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="${AGENTS_DIR}/results"

# Ensure results directory exists
mkdir -p "$RESULTS_DIR"

# Validate arguments
if [[ -z "$AGENT_ID" ]]; then
    echo "Error: Agent ID is required" >&2
    echo "Usage: $(basename "$0") <agent-id> [task-file]" >&2
    exit 1
fi

# Validate task file if provided
if [[ -n "$TASK_FILE" && ! -f "$TASK_FILE" ]]; then
    echo "Error: Task file not found: $TASK_FILE" >&2
    exit 1
fi

# Session name based on agent ID
SESSION_NAME="agent-${AGENT_ID}"

# Log file for this run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${RESULTS_DIR}/${AGENT_ID}_${TIMESTAMP}.log"

# Start timestamp
START_TIME=$(date +%s)
START_DATETIME=$(date '+%Y-%m-%d %H:%M:%S')

# Helper function to calculate elapsed time
calculate_elapsed() {
    local end_time=$1
    local elapsed=$((end_time - START_TIME))
    local hours=$((elapsed / 3600))
    local minutes=$(((elapsed % 3600) / 60))
    local seconds=$((elapsed % 60))

    if [[ $hours -gt 0 ]]; then
        printf "%dh %dm %ds" "$hours" "$minutes" "$seconds"
    elif [[ $minutes -gt 0 ]]; then
        printf "%dm %ds" "$minutes" "$seconds"
    else
        printf "%ds" "$seconds"
    fi
}

# Notification function
send_notification() {
    local title="$1"
    local message="$2"
    local priority="${3:-info}"

    if [[ -x "$SCRIPT_DIR/notify.sh" ]]; then
        "$SCRIPT_DIR/notify.sh" "$title" "$message" "$priority" || true
    fi
}

# Send start notification
send_notification \
    "Agent Started" \
    "Agent: $AGENT_ID
Start Time: $START_DATETIME
Task: ${TASK_FILE:-Interactive Session}" \
    "info"

# Check if tmux session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Killing existing tmux session: $SESSION_NAME"
    tmux kill-session -t "$SESSION_NAME"
fi

# Create new tmux session and run Claude
tmux new-session -d -s "$SESSION_NAME" -x 250 -y 50

# Build the command
if [[ -n "$TASK_FILE" ]]; then
    CLAUDE_CMD="claude --from-file '$TASK_FILE'"
else
    CLAUDE_CMD="claude"
fi

# Execute in tmux
tmux send-keys -t "$SESSION_NAME" "cd '$AGENTS_DIR' && $CLAUDE_CMD | tee -a '$LOG_FILE'" Enter

# Wait for the session to complete
echo "Launching agent session: $SESSION_NAME"
echo "Task file: ${TASK_FILE:-(interactive)}"
echo "Log file: $LOG_FILE"
echo ""
echo "Use 'tmux attach-session -t $SESSION_NAME' to view the session"
echo "Use 'tmux kill-session -t $SESSION_NAME' to stop the session"

# Monitor the session with timeout of 24 hours
MAX_WAIT=$((24 * 3600))
WAIT_COUNT=0
POLL_INTERVAL=30

while tmux has-session -t "$SESSION_NAME" 2>/dev/null; do
    sleep $POLL_INTERVAL
    WAIT_COUNT=$((WAIT_COUNT + POLL_INTERVAL))

    # Timeout protection (24 hours)
    if [[ $WAIT_COUNT -gt $MAX_WAIT ]]; then
        echo "Warning: Agent session exceeded 24-hour timeout limit"
        tmux kill-session -t "$SESSION_NAME"
        break
    fi
done

# Agent has completed
END_TIME=$(date +%s)
END_DATETIME=$(date '+%Y-%m-%d %H:%M:%S')
ELAPSED=$(calculate_elapsed "$END_TIME")

# Log completion
echo "Agent completed at $END_DATETIME" >> "$LOG_FILE"
echo "Elapsed time: $ELAPSED" >> "$LOG_FILE"

# Send completion notification
send_notification \
    "Agent Completed" \
    "Agent: $AGENT_ID
End Time: $END_DATETIME
Elapsed Time: $ELAPSED
Log: $LOG_FILE" \
    "success"

exit 0
