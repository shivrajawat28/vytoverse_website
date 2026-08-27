#!/bin/bash

PASS=0
FAIL=0
BACKEND_PID=""
PREVIEW_PID=""

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

ok() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL + 1)); }

cleanup() {
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    [ -n "$PREVIEW_PID" ] && kill $PREVIEW_PID 2>/dev/null
    wait 2>/dev/null
}
trap cleanup EXIT

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   VytoVerse Live End-to-End Test Suite       ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ─── Phase 1: Start Backend ───
echo -e "${BOLD}${YELLOW}▸ Phase 1: Starting Backend${NC}"
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level warning > /tmp/vytoverse_backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

echo -n "  Waiting for backend"
for i in $(seq 1 20); do
    if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
        echo -e " ${GREEN}ready${NC}"
        break
    fi
    echo -n "."
    sleep 0.5
done

if ! curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo -e " ${RED}FAILED${NC}"
    cat /tmp/vytoverse_backend.log
    exit 1
fi

echo -e "  ${CYAN}Seeding database...${NC}"
python -c "from app.utils.seed import seed_database; seed_database()" 2>&1 | sed 's/^/    /'
cd ..

echo ""

# Helper: make request, store HTTP_CODE and BODY in globals
api() {
    local RESP
    RESP=$(curl -s -w "\n__HTTPCODE__%{http_code}" "$@")
    HTTP_CODE=$(echo "$RESP" | tail -1 | sed 's/__HTTPCODE__//')
    BODY=$(echo "$RESP" | sed '$d')
}

echo -e "${BOLD}${YELLOW}▸ Phase 2: Backend API Tests${NC}"

# ── Auth ──
echo -e "  ${CYAN}Authentication${NC}"
api -X POST http://127.0.0.1:8000/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"name":"Live Test","email":"live@test.com","password":"test1234"}'
[[ "$HTTP_CODE" == "201" ]] && ok "Signup returns 201" || fail "Signup returns $HTTP_CODE"
USER_TOKEN=$(echo "$BODY" | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
USER_ID=$(echo "$BODY" | python -c "import sys,json;print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)
[ -n "$USER_TOKEN" ] && ok "JWT token received" || fail "No JWT token"

api -X POST http://127.0.0.1:8000/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"name":"Dup","email":"live@test.com","password":"test1234"}'
[[ "$HTTP_CODE" == "400" ]] && ok "Duplicate rejected (400)" || fail "Duplicate returns $HTTP_CODE"

api -X POST http://127.0.0.1:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@vytoverse.com","password":"admin123"}'
[[ "$HTTP_CODE" == "200" ]] && ok "Admin login 200" || fail "Admin login $HTTP_CODE"
ADMIN_TOKEN=$(echo "$BODY" | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

api -X POST http://127.0.0.1:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@vytoverse.com","password":"wrong"}'
[[ "$HTTP_CODE" == "401" ]] && ok "Wrong password 401" || fail "Wrong password $HTTP_CODE"

api http://127.0.0.1:8000/auth/me -H "Authorization: Bearer $USER_TOKEN"
[[ "$HTTP_CODE" == "200" ]] && ok "GET /auth/me 200" || fail "GET /auth/me $HTTP_CODE"
EMAIL=$(echo "$BODY" | python -c "import sys,json;print(json.load(sys.stdin)['email'])" 2>/dev/null)
[[ "$EMAIL" == "live@test.com" ]] && ok "Correct email" || fail "Email mismatch: $EMAIL"

api http://127.0.0.1:8000/auth/me
[[ "$HTTP_CODE" == "401" ]] && ok "Unauth /me 401" || fail "Unauth /me $HTTP_CODE"

# ── Profile ──
echo ""
echo -e "  ${CYAN}Profile${NC}"
api -X PUT http://127.0.0.1:8000/users/me \
    -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"bio":"Live test bio","department":"CS"}'
[[ "$HTTP_CODE" == "200" ]] && ok "Profile update 200" || fail "Profile update $HTTP_CODE"
BIO=$(echo "$BODY" | python -c "import sys,json;print(json.load(sys.stdin)['bio'])" 2>/dev/null)
[[ "$BIO" == "Live test bio" ]] && ok "Bio persisted" || fail "Bio: $BIO"

# ── Team ──
echo ""
echo -e "  ${CYAN}Team${NC}"
api http://127.0.0.1:8000/team
[[ "$HTTP_CODE" == "200" ]] && ok "GET /team 200" || fail "GET /team $HTTP_CODE"
TC=$(echo "$BODY" | python -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null)
[[ "$TC" -gt 0 ]] && ok "Team has $TC members" || fail "Team empty"

# ── Authorization ──
echo ""
echo -e "  ${CYAN}Authorization${NC}"
api http://127.0.0.1:8000/admin/users -H "Authorization: Bearer $ADMIN_TOKEN"
[[ "$HTTP_CODE" == "200" ]] && ok "Admin list users 200" || fail "Admin users $HTTP_CODE"

api http://127.0.0.1:8000/admin/users -H "Authorization: Bearer $USER_TOKEN"
[[ "$HTTP_CODE" == "403" ]] && ok "Non-admin blocked 403" || fail "Non-admin $HTTP_CODE"

# ── Team Membership ──
echo ""
echo -e "  ${CYAN}Team Membership${NC}"
api -X PUT http://127.0.0.1:8000/admin/users/$USER_ID/team \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"team_membership":1}'
[[ "$HTTP_CODE" == "200" ]] && ok "Toggle team ON 200" || fail "Toggle team $HTTP_CODE"
TM=$(echo "$BODY" | python -c "import sys,json;print(json.load(sys.stdin)['team_membership'])" 2>/dev/null)
[[ "$TM" == "1" ]] && ok "team_membership=1" || fail "team_membership=$TM"

api http://127.0.0.1:8000/team
IN=$(echo "$BODY" | python -c "import sys,json;ids=[m['id'] for m in json.load(sys.stdin)];print('y' if $USER_ID in ids else 'n')" 2>/dev/null)
[[ "$IN" == "y" ]] && ok "User in /team list" || fail "User not in /team"

api -X PUT http://127.0.0.1:8000/admin/users/$USER_ID/team \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"team_membership":0}'
TM=$(echo "$BODY" | python -c "import sys,json;print(json.load(sys.stdin)['team_membership'])" 2>/dev/null)
[[ "$TM" == "0" ]] && ok "team_membership=0" || fail "team_membership=$TM"

# ── Stars ──
echo ""
echo -e "  ${CYAN}Stars${NC}"
api -X POST http://127.0.0.1:8000/admin/users/$USER_ID/stars \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"stars":42}'
[[ "$HTTP_CODE" == "200" ]] && ok "Assign stars 200" || fail "Stars $HTTP_CODE"
ST=$(echo "$BODY" | python -c "import sys,json;print(json.load(sys.stdin)['stars'])" 2>/dev/null)
[[ "$ST" == "42" ]] && ok "Stars=42" || fail "Stars=$ST"

api -X POST http://127.0.0.1:8000/admin/users/$USER_ID/stars \
    -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"stars":1}'
[[ "$HTTP_CODE" == "403" ]] && ok "Non-admin stars 403" || fail "Non-admin stars $HTTP_CODE"

# ── Events ──
echo ""
echo -e "  ${CYAN}Events${NC}"
api http://127.0.0.1:8000/events
[[ "$HTTP_CODE" == "200" ]] && ok "List events 200" || fail "Events $HTTP_CODE"

api http://127.0.0.1:8000/events/upcoming
[[ "$HTTP_CODE" == "200" ]] && ok "Upcoming events 200" || fail "Upcoming $HTTP_CODE"

api -X POST http://127.0.0.1:8000/admin/events \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"E2E Event","date":"2025-12-15","location":"Hall A","status":"upcoming"}'
[[ "$HTTP_CODE" == "201" ]] && ok "Create event 201" || fail "Create event $HTTP_CODE"
EID=$(echo "$BODY" | python -c "import sys,json;print(json.load(sys.stdin)['id'])" 2>/dev/null)

api http://127.0.0.1:8000/events/$EID
TITLE=$(echo "$BODY" | python -c "import sys,json;print(json.load(sys.stdin)['title'])" 2>/dev/null)
[[ "$HTTP_CODE" == "200" && "$TITLE" == "E2E Event" ]] && ok "Get event correct" || fail "Get event $HTTP_CODE/$TITLE"

api -X PUT http://127.0.0.1:8000/admin/events/$EID \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"Updated E2E"}'
[[ "$HTTP_CODE" == "200" ]] && ok "Update event 200" || fail "Update event $HTTP_CODE"

api -X DELETE http://127.0.0.1:8000/admin/events/$EID -H "Authorization: Bearer $ADMIN_TOKEN"
[[ "$HTTP_CODE" == "204" ]] && ok "Delete event 204" || fail "Delete event $HTTP_CODE"

api http://127.0.0.1:8000/events/99999
[[ "$HTTP_CODE" == "404" ]] && ok "Missing event 404" || fail "Missing event $HTTP_CODE"

# ── Library ──
echo ""
echo -e "  ${CYAN}Library${NC}"
api http://127.0.0.1:8000/library
[[ "$HTTP_CODE" == "200" ]] && ok "List library 200" || fail "Library $HTTP_CODE"

api http://127.0.0.1:8000/library/categories
[[ "$HTTP_CODE" == "200" ]] && ok "Categories 200" || fail "Categories $HTTP_CODE"

api -X POST http://127.0.0.1:8000/admin/library \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"E2E Resource","category":"Testing","resource_type":"pdf"}'
[[ "$HTTP_CODE" == "201" ]] && ok "Create resource 201" || fail "Create resource $HTTP_CODE"
RID=$(echo "$BODY" | python -c "import sys,json;print(json.load(sys.stdin)['id'])" 2>/dev/null)

api http://127.0.0.1:8000/library/$RID
[[ "$HTTP_CODE" == "200" ]] && ok "Get resource 200" || fail "Get resource $HTTP_CODE"

api -X PUT http://127.0.0.1:8000/admin/library/$RID \
    -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"title":"Updated Res"}'
[[ "$HTTP_CODE" == "200" ]] && ok "Update resource 200" || fail "Update resource $HTTP_CODE"

api -X DELETE http://127.0.0.1:8000/admin/library/$RID -H "Authorization: Bearer $ADMIN_TOKEN"
[[ "$HTTP_CODE" == "204" ]] && ok "Delete resource 204" || fail "Delete resource $HTTP_CODE"

# ── Stats & Infra ──
echo ""
echo -e "  ${CYAN}Stats & Infrastructure${NC}"
api http://127.0.0.1:8000/stats
[[ "$HTTP_CODE" == "200" ]] && ok "Stats 200" || fail "Stats $HTTP_CODE"

api http://127.0.0.1:8000/docs
[[ "$HTTP_CODE" == "200" ]] && ok "Swagger docs 200" || fail "Swagger $HTTP_CODE"

api -X OPTIONS http://127.0.0.1:8000/auth/login \
    -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST"
[[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "204" ]] && ok "CORS preflight" || fail "CORS $HTTP_CODE"

echo ""

# ─── Phase 3: Frontend ───
echo -e "${BOLD}${YELLOW}▸ Phase 3: Frontend Build & Preview${NC}"
cd frontend
BUILD_OUT=$(npm run build 2>&1)
BUILD_RC=$?
[[ $BUILD_RC -eq 0 ]] && ok "npm run build succeeds" || fail "Build failed (rc=$BUILD_RC)"

[[ -f "dist/index.html" ]] && ok "index.html generated" || fail "No index.html"
JS_COUNT=$(ls dist/assets/*.js 2>/dev/null | wc -l | tr -d ' ')
[[ "$JS_COUNT" -gt 0 ]] && ok "$JS_COUNT JS bundle(s) generated" || fail "No JS bundles"
CSS_COUNT=$(ls dist/assets/*.css 2>/dev/null | wc -l | tr -d ' ')
[[ "$CSS_COUNT" -gt 0 ]] && ok "$CSS_COUNT CSS bundle(s) generated" || fail "No CSS bundles"

THREE=$(ls dist/assets/ThreeHero* 2>/dev/null | head -1)
[ -n "$THREE" ] && ok "ThreeHero lazy-loaded as separate chunk" || fail "ThreeHero not code-split"

echo ""
echo -e "${BOLD}${YELLOW}▸ Phase 4: Frontend Preview Server${NC}"
npx vite preview --port 4173 --host 127.0.0.1 > /tmp/vytoverse_preview.log 2>&1 &
PREVIEW_PID=$!

echo -n "  Waiting for preview"
for i in $(seq 1 15); do
    if curl -sf http://127.0.0.1:4173 >/dev/null 2>&1; then
        echo -e " ${GREEN}ready${NC}"
        break
    fi
    echo -n "."
    sleep 0.5
done

if curl -sf http://127.0.0.1:4173 >/dev/null 2>&1; then
    echo -e "  ${CYAN}Page Routes${NC}"
    for p in "/" "/about" "/events" "/team" "/library" "/login" "/signup" "/profile" "/admin"; do
        R=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173$p)
        [[ "$R" == "200" ]] && ok "GET $p → 200" || fail "GET $p → $R"
    done

    HTML=$(curl -s http://127.0.0.1:4173/)
    echo "$HTML" | grep -q "VytoVerse" && ok "HTML contains VytoVerse branding" || fail "Missing VytoVerse in HTML"
    echo "$HTML" | grep -q "assets/" && ok "HTML references asset bundles" || fail "No asset refs in HTML"
else
    fail "Preview server failed to start"
fi

kill $PREVIEW_PID 2>/dev/null; wait 2>/dev/null
PREVIEW_PID=""
cd ..

# ─── Summary ───
echo ""
TOTAL=$((PASS + FAIL))
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║              Test Results                    ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""
if [ $FAIL -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}All $TOTAL tests passed! 🎉${NC}"
else
    echo -e "  ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC} / $TOTAL total"
fi
echo ""
[ $FAIL -gt 0 ] && exit 1 || exit 0
