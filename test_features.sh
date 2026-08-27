#!/bin/bash

PASS=0
FAIL=0
BACKEND="http://127.0.0.1:8000"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

ok() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL + 1)); }

api() {
    RESP=$(curl -s -w "\n__HTTPCODE__%{http_code}" "$@")
    HTTP_CODE=$(echo "$RESP" | tail -1 | sed 's/__HTTPCODE__//')
    BODY=$(echo "$RESP" | sed '$d')
}

cleanup() { pkill -f "uvicorn app.main:app" 2>/dev/null; }
trap cleanup EXIT

echo -e "\n${BOLD}${CYAN}▸ Starting Backend${NC}"
cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level warning > /tmp/vytoverse_features.log 2>&1 &
sleep 3
if ! curl -sf $BACKEND/health >/dev/null; then echo "Backend failed to start"; exit 1; fi
echo "  Backend ready"

# ── Auth ──
echo -e "\n${BOLD}${CYAN}▸ Authentication${NC}"
api -X POST $BACKEND/auth/login -H "Content-Type: application/json" -d '{"email":"admin@vytoverse.com","password":"admin123"}'
[[ "$HTTP_CODE" == "200" ]] && ok "Admin login" || fail "Admin login $HTTP_CODE"
ADMIN_TOKEN=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

FEATURE_EMAIL="features_$(date +%s)@test.com"
api -X POST $BACKEND/auth/signup -H "Content-Type: application/json" -d "{\"name\":\"Feature Test\",\"email\":\"$FEATURE_EMAIL\",\"password\":\"test1234\"}"
[[ "$HTTP_CODE" == "201" ]] && ok "User signup" || fail "User signup $HTTP_CODE"
USER_TOKEN=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
USER_ID=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)

# ── Tasks ──
echo -e "\n${BOLD}${CYAN}▸ Tasks${NC}"

# Admin create task
api -X POST $BACKEND/admin/tasks -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"title\":\"Test Task\",\"description\":\"A test task\",\"assigned_user_id\":$USER_ID,\"priority\":\"high\",\"due_date\":\"2025-12-31\"}"
[[ "$HTTP_CODE" == "201" ]] && ok "Admin create task" || fail "Create task $HTTP_CODE"
TASK_ID=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])" 2>/dev/null)
TASK_TITLE=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['title'])" 2>/dev/null)
[[ "$TASK_TITLE" == "Test Task" ]] && ok "Task title correct" || fail "Task title: $TASK_TITLE"
TASK_USER=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['assigned_user_name'])" 2>/dev/null)
[[ -n "$TASK_USER" ]] && ok "Task has assigned_user_name" || fail "No assigned_user_name"

# Admin list tasks
api $BACKEND/admin/tasks -H "Authorization: Bearer $ADMIN_TOKEN"
[[ "$HTTP_CODE" == "200" ]] && ok "Admin list tasks" || fail "Admin list tasks $HTTP_CODE"

# Admin get task
api $BACKEND/admin/tasks/$TASK_ID -H "Authorization: Bearer $ADMIN_TOKEN"
[[ "$HTTP_CODE" == "200" ]] && ok "Admin get task" || fail "Admin get task $HTTP_CODE"

# Admin update task
api -X PUT $BACKEND/admin/tasks/$TASK_ID -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"status":"in_progress","priority":"medium"}'
[[ "$HTTP_CODE" == "200" ]] && ok "Admin update task" || fail "Update task $HTTP_CODE"
TASK_STATUS=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null)
[[ "$TASK_STATUS" == "in_progress" ]] && ok "Task status updated" || fail "Task status: $TASK_STATUS"

# User gets own tasks
api $BACKEND/tasks/me -H "Authorization: Bearer $USER_TOKEN"
[[ "$HTTP_CODE" == "200" ]] && ok "User get my tasks" || fail "User tasks $HTTP_CODE"
MY_TASKS=$(echo "$BODY" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null)
[[ "$MY_TASKS" -gt 0 ]] && ok "User has $MY_TASKS task(s)" || fail "No tasks for user"

# User cannot create task
api -X POST $BACKEND/admin/tasks -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"title":"Unauthorized","assigned_user_id":1}'
[[ "$HTTP_CODE" == "403" ]] && ok "User blocked from creating task" || fail "User create task $HTTP_CODE"

# User cannot access admin tasks
api $BACKEND/admin/tasks -H "Authorization: Bearer $USER_TOKEN"
[[ "$HTTP_CODE" == "403" ]] && ok "User blocked from admin tasks" || fail "User admin tasks $HTTP_CODE"

# Admin reassign task
api2_USER_ID=$(api -X POST $BACKEND/auth/signup -H "Content-Type: application/json" -d "{\"name\":\"Other\",\"email\":\"other_$(date +%s)@test.com\",\"password\":\"test1234\"}" > /dev/null 2>&1 && echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)
# Just test reassign endpoint responds correctly
api -X PUT $BACKEND/admin/tasks/$TASK_ID -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"title\":\"Reassigned Task\",\"assigned_user_id\":$USER_ID}"
[[ "$HTTP_CODE" == "200" ]] && ok "Admin reassign task" || fail "Reassign task $HTTP_CODE"

# Admin delete task
api -X DELETE $BACKEND/admin/tasks/$TASK_ID -H "Authorization: Bearer $ADMIN_TOKEN"
[[ "$HTTP_CODE" == "204" ]] && ok "Admin delete task" || fail "Delete task $HTTP_CODE"

# ── Events Improvements ──
echo -e "\n${BOLD}${CYAN}▸ Events Improvements${NC}"

# Create event with Google Drive URLs
api -X POST $BACKEND/admin/events -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"Feature Event","date":"2099-06-15","status":"upcoming","registration_url":"https://forms.google.com/test","poster_url":"https://drive.google.com/poster","invitation_url":"https://drive.google.com/invite"}'
[[ "$HTTP_CODE" == "201" ]] && ok "Create event with URLs" || fail "Create event $HTTP_CODE"
FEVENT_ID=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])" 2>/dev/null)

# Verify URLs persisted
api $BACKEND/events/$FEVENT_ID
REG_URL=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin).get('registration_url',''))" 2>/dev/null)
POSTER_URL=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin).get('poster_url',''))" 2>/dev/null)
INVITE_URL=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin).get('invitation_url',''))" 2>/dev/null)
[[ "$REG_URL" == "https://forms.google.com/test" ]] && ok "Registration URL persisted" || fail "Reg URL: $REG_URL"
[[ "$POSTER_URL" == "https://drive.google.com/poster" ]] && ok "Poster URL persisted" || fail "Poster URL: $POSTER_URL"
[[ "$INVITE_URL" == "https://drive.google.com/invite" ]] && ok "Invitation URL persisted" || fail "Invite URL: $INVITE_URL"

# Past events endpoint
api $BACKEND/events/past
[[ "$HTTP_CODE" == "200" ]] && ok "GET /events/past" || fail "Past events $HTTP_CODE"

# Upcoming events endpoint
api $BACKEND/events/upcoming
[[ "$HTTP_CODE" == "200" ]] && ok "GET /events/upcoming" || fail "Upcoming events $HTTP_CODE"

# Cleanup
api -X DELETE $BACKEND/admin/events/$FEVENT_ID -H "Authorization: Bearer $ADMIN_TOKEN"
[[ "$HTTP_CODE" == "204" ]] && ok "Delete feature event" || fail "Delete event $HTTP_CODE"

# ── Posters ──
echo -e "\n${BOLD}${CYAN}▸ Posters${NC}"

# Admin create poster
api -X POST $BACKEND/admin/posters -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"Test Poster","image_url":"/uploads/posters/test.png","target_url":"https://example.com","active":true}'
[[ "$HTTP_CODE" == "201" ]] && ok "Admin create poster" || fail "Create poster $HTTP_CODE"
POSTER_ID=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])" 2>/dev/null)

# Admin list posters
api $BACKEND/admin/posters -H "Authorization: Bearer $ADMIN_TOKEN"
[[ "$HTTP_CODE" == "200" ]] && ok "Admin list posters" || fail "Admin list posters $HTTP_CODE"

# Public active posters (should show)
api $BACKEND/posters/active
[[ "$HTTP_CODE" == "200" ]] && ok "Public GET /posters/active" || fail "Public posters $HTTP_CODE"
ACTIVE_COUNT=$(echo "$BODY" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null)
[[ "$ACTIVE_COUNT" -gt 0 ]] && ok "Active poster available" || fail "No active posters"

# Admin update poster
api -X PUT $BACKEND/admin/posters/$POSTER_ID -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"active":false}'
[[ "$HTTP_CODE" == "200" ]] && ok "Admin deactivate poster" || fail "Deactivate poster $HTTP_CODE"

# Public should not show inactive poster
api $BACKEND/posters/active
INACTIVE_CHECK=$(echo "$BODY" | python3 -c "import sys,json;ids=[p['id'] for p in json.load(sys.stdin)];print('y' if $POSTER_ID in ids else 'n')" 2>/dev/null)
[[ "$INACTIVE_CHECK" == "n" ]] && ok "Inactive poster hidden from public" || fail "Inactive poster still visible"

# User cannot manage posters
api -X POST $BACKEND/admin/posters -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"image_url":"bad.png"}'
[[ "$HTTP_CODE" == "403" ]] && ok "User blocked from posters" || fail "User posters $HTTP_CODE"

# Admin delete poster
api -X DELETE $BACKEND/admin/posters/$POSTER_ID -H "Authorization: Bearer $ADMIN_TOKEN"
[[ "$HTTP_CODE" == "204" ]] && ok "Admin delete poster" || fail "Delete poster $HTTP_CODE"

# ── Important Links ──
echo -e "\n${BOLD}${CYAN}▸ Important Links${NC}"

# Admin create link
api -X POST $BACKEND/admin/important-links -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"title\":\"Test Link\",\"description\":\"A private link\",\"url\":\"https://drive.google.com/test\",\"assigned_user_id\":$USER_ID,\"active\":true}"
[[ "$HTTP_CODE" == "201" ]] && ok "Admin create important link" || fail "Create link $HTTP_CODE"
LINK_ID=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])" 2>/dev/null)

# Admin list links
api $BACKEND/admin/important-links -H "Authorization: Bearer $ADMIN_TOKEN"
[[ "$HTTP_CODE" == "200" ]] && ok "Admin list links" || fail "Admin list links $HTTP_CODE"

# Assigned user can see their link
api $BACKEND/important-links/me -H "Authorization: Bearer $USER_TOKEN"
[[ "$HTTP_CODE" == "200" ]] && ok "User get my links" || fail "User links $HTTP_CODE"
MY_LINKS=$(echo "$BODY" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null)
[[ "$MY_LINKS" -gt 0 ]] && ok "User has $MY_LINKS link(s)" || fail "No links for user"

# Create another user who should NOT see the link
OTHER_EMAIL="other_$(date +%s)@test.com"
api -X POST $BACKEND/auth/signup -H "Content-Type: application/json" -d "{\"name\":\"Other\",\"email\":\"$OTHER_EMAIL\",\"password\":\"test1234\"}"
OTHER_TOKEN=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
OTHER_ID=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)

api $BACKEND/important-links/me -H "Authorization: Bearer $OTHER_TOKEN"
OTHER_LINKS=$(echo "$BODY" | python3 -c "import sys,json;ids=[l['id'] for l in json.load(sys.stdin)];print('y' if $LINK_ID in ids else 'n')" 2>/dev/null)
[[ "$OTHER_LINKS" == "n" ]] && ok "Other user cannot see private link" || fail "Privacy breach!"

# User cannot create links
api -X POST $BACKEND/admin/important-links -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"title":"Bad","url":"https://bad.com","assigned_user_id":1}'
[[ "$HTTP_CODE" == "403" ]] && ok "User blocked from creating links" || fail "User create link $HTTP_CODE"

# User cannot access admin links
api $BACKEND/admin/important-links -H "Authorization: Bearer $USER_TOKEN"
[[ "$HTTP_CODE" == "403" ]] && ok "User blocked from admin links" || fail "User admin links $HTTP_CODE"

# Admin update link
api -X PUT $BACKEND/admin/important-links/$LINK_ID -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"active":false}'
[[ "$HTTP_CODE" == "200" ]] && ok "Admin update link" || fail "Update link $HTTP_CODE"

# Deactivated link should not appear
api $BACKEND/important-links/me -H "Authorization: Bearer $USER_TOKEN"
DEACT_CHECK=$(echo "$BODY" | python3 -c "import sys,json;ids=[l['id'] for l in json.load(sys.stdin)];print('y' if $LINK_ID in ids else 'n')" 2>/dev/null)
[[ "$DEACT_CHECK" == "n" ]] && ok "Deactivated link hidden from user" || fail "Deactivated link still visible"

# Admin delete link
api -X DELETE $BACKEND/admin/important-links/$LINK_ID -H "Authorization: Bearer $ADMIN_TOKEN"
[[ "$HTTP_CODE" == "204" ]] && ok "Admin delete link" || fail "Delete link $HTTP_CODE"

# ── Stats ──
echo -e "\n${BOLD}${CYAN}▸ Stats${NC}"
api $BACKEND/stats
[[ "$HTTP_CODE" == "200" ]] && ok "Stats endpoint" || fail "Stats $HTTP_CODE"
HAS_TASKS=$(echo "$BODY" | python3 -c "import sys,json;d=json.load(sys.stdin);print('y' if 'active_tasks' in d else 'n')" 2>/dev/null)
[[ "$HAS_TASKS" == "y" ]] && ok "Stats has active_tasks" || fail "Missing active_tasks"
HAS_POSTERS=$(echo "$BODY" | python3 -c "import sys,json;d=json.load(sys.stdin);print('y' if 'active_posters' in d else 'n')" 2>/dev/null)
[[ "$HAS_POSTERS" == "y" ]] && ok "Stats has active_posters" || fail "Missing active_posters"
HAS_LINKS=$(echo "$BODY" | python3 -c "import sys,json;d=json.load(sys.stdin);print('y' if 'total_links' in d else 'n')" 2>/dev/null)
[[ "$HAS_LINKS" == "y" ]] && ok "Stats has total_links" || fail "Missing total_links"
HAS_TEAM=$(echo "$BODY" | python3 -c "import sys,json;d=json.load(sys.stdin);print('y' if 'team_members' in d else 'n')" 2>/dev/null)
[[ "$HAS_TEAM" == "y" ]] && ok "Stats has team_members" || fail "Missing team_members"

# ── Summary ───
echo ""
TOTAL=$((PASS + FAIL))
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║           Feature Test Results               ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""
if [ $FAIL -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}All $TOTAL tests passed! 🎉${NC}"
else
    echo -e "  ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC} / $TOTAL total"
fi
echo ""
[ $FAIL -gt 0 ] && exit 1 || exit 0
