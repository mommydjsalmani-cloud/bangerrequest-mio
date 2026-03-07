#!/usr/bin/env bash
set -euo pipefail

MAX_BYTES=${MAX_GIT_FILE_BYTES:-104857600} # 100 MB default

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

print_human_mb() {
  local bytes=$1
  awk -v b="$bytes" 'BEGIN { printf "%.2f MB", b / 1024 / 1024 }'
}

declare -A SEEN
declare -a OFFENDERS
OFFENDER_COUNT=0

check_blob_size() {
  local object_id=$1
  local path=$2

  if [[ -n "${SEEN[$object_id]:-}" ]]; then
    return
  fi
  SEEN[$object_id]=1

  if [[ "$(git cat-file -t "$object_id")" != "blob" ]]; then
    return
  fi

  local size
  size=$(git cat-file -s "$object_id")
  if (( size > MAX_BYTES )); then
    OFFENDERS+=("$size|$path|$object_id")
    OFFENDER_COUNT=$((OFFENDER_COUNT + 1))
  fi
}

manual_staged_check() {
  local staged_files
  staged_files=$(git diff --cached --name-only --diff-filter=AM)
  if [[ -z "$staged_files" ]]; then
    echo "No staged files to check."
    return 0
  fi

  while IFS= read -r file; do
    [[ -f "$file" ]] || continue
    local size
    size=$(wc -c < "$file")
    if (( size > MAX_BYTES )); then
      OFFENDERS+=("$size|$file|working-tree")
      OFFENDER_COUNT=$((OFFENDER_COUNT + 1))
    fi
  done <<< "$staged_files"

  return 0
}

check_push_objects() {
  local local_ref local_sha remote_ref remote_sha
  while read -r local_ref local_sha remote_ref remote_sha; do
    [[ -z "${local_ref:-}" ]] && continue

    # Deletion push: nothing to validate.
    if [[ "$local_sha" =~ ^0+$ ]]; then
      continue
    fi

    local rev_list_cmd
    if [[ "$remote_sha" =~ ^0+$ ]]; then
      rev_list_cmd=(git rev-list --objects "$local_sha" --not --all)
    else
      rev_list_cmd=(git rev-list --objects "$remote_sha..$local_sha")
    fi

    while read -r object_id object_path; do
      [[ -z "${object_id:-}" ]] && continue
      check_blob_size "$object_id" "${object_path:-unknown-path}"
    done < <("${rev_list_cmd[@]}")
  done
}

if [[ "${1:-}" == "--staged" ]] || [[ -t 0 ]]; then
  manual_staged_check
else
  check_push_objects
fi

if (( OFFENDER_COUNT > 0 )); then
  echo
  echo "Push blocked: detected file(s) larger than $(print_human_mb "$MAX_BYTES")."
  for item in "${OFFENDERS[@]}"; do
    IFS='|' read -r size path object_id <<< "$item"
    echo " - $path ($(print_human_mb "$size"), object: $object_id)"
  done
  echo
  echo "Fix options:"
  echo "1) Remove large files from commit history/staging"
  echo "2) Move archives outside git"
  echo "3) Use Git LFS if really needed"
  exit 1
fi

exit 0