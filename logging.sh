#!/bin/bash
set -euo pipefail
[ "$(id -u)" -eq 0 ] || exec sudo "$0" "$@"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/deploy.conf"
if [ -f "$CONFIG_FILE" ]; then
    # shellcheck source=/dev/null
    source "$CONFIG_FILE"
fi
LOG_DIR="${LOG_DIR:-/var/log/pznr}"
OUTPUT_LINES=200
READ_LINES_PER_FILE=200
FOLLOW=0
INCLUDE_ROTATED=0

usage() {
    cat <<EOF
Usage: sudo $0 [options]

Merged, time-sorted logs from nginx and PZNR services under $LOG_DIR.

Options:
  -f, --follow          Stream new lines (near time-sorted)
  -n, --lines N         Show last N lines after global time sort (default: $OUTPUT_LINES)
  -z, --rotated         Include recent rotated .gz logs in snapshot mode
  -h, --help            Show this help
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        -f | --follow) FOLLOW=1 ;;
        -n | --lines)
            shift
            OUTPUT_LINES="${1:?missing value for -n}"
            READ_LINES_PER_FILE="$OUTPUT_LINES"
            ;;
        -z | --rotated) INCLUDE_ROTATED=1 ;;
        -h | --help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage >&2
            exit 1
            ;;
    esac
    shift
done

USE_COLOR=1
if [ -n "${NO_COLOR:-}" ] || [ ! -t 1 ]; then
    USE_COLOR=0
fi

RESET=$'\033[0m'
BLUE=$'\033[34m'
GREEN=$'\033[32m'
RED=$'\033[31m'
ORANGE=$'\033[38;5;208m'
DIM=$'\033[2m'

print_line() {
    local src="$1"
    local line="$2"
    local lower
    local error_re='(^|[^a-z])(error|err|critical|crit|emerg|alert|fatal|failed|failure)([^a-z]|$)|\[error\]| (4[0-9]{2}|5[0-9]{2}) '
    local warn_re='(^|[^a-z])(warning|warn)([^a-z]|$)|\[warn\]'
    local info_re='(^|[^a-z])(info)([^a-z]|$)|\[info\]'
    lower="$(printf '%s' "$line" | tr '[:upper:]' '[:lower:]')"

    if [ "$USE_COLOR" -eq 0 ]; then
        printf '[%s] %s\n' "$src" "$line"
        return
    fi

    local color="$BLUE"
    if [[ "$lower" =~ $error_re ]]; then
        color="$RED"
    elif [[ "$lower" =~ $warn_re ]]; then
        color="$ORANGE"
    elif [[ "$lower" =~ $info_re ]]; then
        color="$GREEN"
    fi
    printf '%b[%s]%b %b%s%b\n' "$DIM" "$src" "$RESET" "$color" "$line" "$RESET"
}

parse_sort_key() {
    local line="$1"
    local epoch=""
    local sub=0
    local bracket_re='\[([0-9]{2}/[A-Za-z]{3}/[0-9]{4}:[0-9]{2}:[0-9]{2}:[0-9]{2})'
    local iso_ms_re='([0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}:[0-9]{2})[.,]([0-9]+)'
    local iso_re='([0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}:[0-9]{2})'
    local slash_re='([0-9]{4}/[0-9]{2}/[0-9]{2}[[:space:]][0-9]{2}:[0-9]{2}:[0-9]{2})'

    if [[ "$line" =~ $bracket_re ]]; then
        local dt="${BASH_REMATCH[1]/:/ }"
        epoch="$(date -d "$dt" +%s 2>/dev/null || true)"
    elif [[ "$line" =~ $iso_ms_re ]]; then
        local ts="${BASH_REMATCH[1]}"
        ts="${ts/T/ }"
        epoch="$(date -d "$ts" +%s 2>/dev/null || true)"
        sub="${BASH_REMATCH[2]}"
        sub="${sub//[^0-9]/}"
        sub="${sub:0:6}"
    elif [[ "$line" =~ $iso_re ]]; then
        local ts="${BASH_REMATCH[1]}"
        ts="${ts/T/ }"
        epoch="$(date -d "$ts" +%s 2>/dev/null || true)"
    elif [[ "$line" =~ $slash_re ]]; then
        local nginx_ts="${BASH_REMATCH[1]//\//-}"
        epoch="$(date -d "$nginx_ts" +%s 2>/dev/null || true)"
    fi

    if [ -z "$epoch" ]; then
        epoch="0"
    fi
    printf '%s\t%s' "$epoch" "$sub"
}

declare -a LOG_SOURCES=()

add_source() {
    local path="$1"
    local label="$2"
    [ -r "$path" ] || return 0
    LOG_SOURCES+=("${path}|${label}")
}

add_source "$LOG_DIR/nginx-access.log" "nginx-access"
add_source "$LOG_DIR/nginx-error.log" "nginx-error"
add_source "$LOG_DIR/run_due_processes.log" "run-due-processes"
add_source "$LOG_DIR/run_expired_reminders.log" "run-expired-reminders"
add_source "$LOG_DIR/process_ai_document_queue.log" "process-ai-queue"
add_source "$LOG_DIR/mail.log" "mail"

if [ -d "$LOG_DIR/backend" ]; then
    for path in "$LOG_DIR"/backend/*.log; do
        [ -f "$path" ] || continue
        add_source "$path" "backend/$(basename "$path")"
    done
fi

if [ "${#LOG_SOURCES[@]}" -eq 0 ]; then
    echo "No readable log files under $LOG_DIR" >&2
    exit 1
fi

read_lines_from_source() {
    local path="$1"
    local label="$2"
    local seq=0
    local carry=0
    local last_epoch=0
    local last_sub=0
    local file_mtime
    file_mtime="$(stat -c %Y "$path" 2>/dev/null || echo 0)"

    emit() {
        local line="$1"
        local epoch="$2"
        local sub="$3"
        seq=$((seq + 1))
        if [ "$epoch" = "0" ]; then
            if [ "$last_epoch" -gt 0 ]; then
                epoch="$last_epoch"
                carry=$((carry + 1))
                sub=$((last_sub + carry))
            else
                epoch="$file_mtime"
                sub="$seq"
            fi
        else
            last_epoch="$epoch"
            last_sub="$sub"
            carry=0
        fi
        printf '%s\t%s\t%s\t%s\t%s\n' "$epoch" "$sub" "$label" "$seq" "$line"
    }

    process_line() {
        local line="$1"
        local epoch sub
        IFS=$'\t' read -r epoch sub <<< "$(parse_sort_key "$line")"
        emit "$line" "$epoch" "$sub"
    }

    if [ "$INCLUDE_ROTATED" -eq 1 ]; then
        local rotated
        for rotated in $(ls -1t "${path}".*.gz 2>/dev/null | head -n 1); do
            [ -r "$rotated" ] || continue
            while IFS= read -r line; do
                [ -n "$line" ] || continue
                process_line "$line"
            done < <(zcat -f "$rotated" 2>/dev/null || true)
        done
    fi

    [ -r "$path" ] || return 0
    while IFS= read -r line; do
        [ -n "$line" ] || continue
        process_line "$line"
    done < <(tail -n "$READ_LINES_PER_FILE" "$path" 2>/dev/null || true)
}

print_snapshot() {
    local merged
    merged="$(mktemp)"
    trap 'rm -f "$merged"' RETURN

    local spec path label
    for spec in "${LOG_SOURCES[@]}"; do
        path="${spec%%|*}"
        label="${spec#*|}"
        read_lines_from_source "$path" "$label" >>"$merged"
    done

    sort -t $'\t' -k1,1n -k2,2n -k4,4n "$merged" | tail -n "$OUTPUT_LINES" | while IFS=$'\t' read -r _epoch _sub src _seq line; do
        print_line "$src" "$line"
    done
}

follow_logs() {
    declare -A label_for=()
    local -a paths=()
    local spec path label
    for spec in "${LOG_SOURCES[@]}"; do
        path="${spec%%|*}"
        label="${spec#*|}"
        paths+=("$path")
        label_for["$path"]="$label"
    done

    declare -a buf_epoch=() buf_sub=() buf_label=() buf_line=()

    flush_buffer() {
        local cutoff="$1"
        local -a order=()
        local i
        for i in "${!buf_epoch[@]}"; do
            if [ "${buf_epoch[$i]}" -le "$cutoff" ]; then
                order+=("$i")
            fi
        done
        if [ "${#order[@]}" -eq 0 ]; then
            return 0
        fi
        local sorted
        sorted="$(
            for i in "${order[@]}"; do
                printf '%s\t%s\t%s\t%s\n' "${buf_epoch[$i]}" "${buf_sub[$i]}" "${buf_label[$i]}" "${buf_line[$i]}"
            done | sort -t $'\t' -k1,1n -k2,2n
        )"
        while IFS=$'\t' read -r _epoch _sub src line; do
            print_line "$src" "$line"
        done <<<"$sorted"
        local -a new_epoch=() new_sub=() new_label=() new_line=()
        for i in "${!buf_epoch[@]}"; do
            if [ "${buf_epoch[$i]}" -gt "$cutoff" ]; then
                new_epoch+=("${buf_epoch[$i]}")
                new_sub+=("${buf_sub[$i]}")
                new_label+=("${buf_label[$i]}")
                new_line+=("${buf_line[$i]}")
            fi
        done
        buf_epoch=("${new_epoch[@]}")
        buf_sub=("${new_sub[@]}")
        buf_label=("${new_label[@]}")
        buf_line=("${new_line[@]}")
    }

    local current_label=""
    local tail_marker_re='^==>[[:space:]]*(.+)[[:space:]]*<==$'
    tail -n 0 -F "${paths[@]}" 2>/dev/null | while IFS= read -r line; do
        if [[ "$line" =~ $tail_marker_re ]]; then
            current_label="${label_for[${BASH_REMATCH[1]}]:-$(basename "${BASH_REMATCH[1]}")}"
            continue
        fi
        [ -n "$line" ] || continue
        local epoch sub
        IFS=$'\t' read -r epoch sub <<< "$(parse_sort_key "$line")"
        if [ "$epoch" = "0" ]; then
            epoch="$(date +%s)"
            sub=0
        fi
        buf_epoch+=("$epoch")
        buf_sub+=("$sub")
        buf_label+=("$current_label")
        buf_line+=("$line")
        local now
        now="$(date +%s)"
        flush_buffer $((now - 1))
    done
}

echo "Log dir: $LOG_DIR (${#LOG_SOURCES[@]} sources, last $OUTPUT_LINES merged lines)" >&2
if [ "$FOLLOW" -eq 1 ]; then
    follow_logs
else
    print_snapshot
fi
