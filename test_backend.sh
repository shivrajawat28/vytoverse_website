#!/bin/bash
set -e

# Start backend
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
SERVER_PID=$!
sleep 3

PASS=0
FAIL=0

check() {
    local desc="$1"
    local expected="$2"
    local actual="$3"
    if echo "$actual" | grep -q "$expected"; then
        echo "  ✅ PASS: $desc"
        PASS=$((PASS+1))
    else
        echo "  ❌ FAIL: $desc (expected: $expected)"
        echo "         got: $actual"
        FAIL=$((FAIL+1))
    fi
}

echo ""
echo "======================================"
echo "  VytoVerse Backend API Test Suite"
echo "======================================"
echo ""

# ---- Health ----
echo "1. HEALTH CHECK"
R=$(curl -s http://127.0.0.1:8000/)
check "Root endpoint returns API info" "VytoVerse API" "$R"
R=$(curl -s http://127.0.0.1:8000/health)
check "Health endpoint" "healthy" "$R"

# ---- Signup ----
echo ""
echo "2. AUTHENTICATION"
R=$(curl -s -X POST http://127.0.0.1:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"E2E Test User","email":"e2e@test.com","password":"test1234"}')
check "Signup succeeds" "access_token" "$R"
USER_TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

# Duplicate email
R=$(curl -s -X POST http://127.0.0.1:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"E2E Test User","email":"e2e@test.com","password":"test1234"}')
check "Duplicate email rejected" "Email already registered" "$R"

# Login correct
R=$(curl -s -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e@test.com","password":"test1234"}')
check "Login with correct credentials" "access_token" "$R"

# Login wrong password
R=$(curl -s -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e@test.com","password":"wrongpass"}')
check "Login with wrong password fails" "Invalid email or password" "$R"

# Protected endpoint no token
R=$(curl -s http://127.0.0.1:8000/auth/me)
check "Protected endpoint rejects unauthenticated" "Not authenticated" "$R"

# Protected endpoint valid token
R=$(curl -s http://127.0.0.1:8000/auth/me \
  -H "Authorization: Bearer $USER_TOKEN")
check "Protected endpoint accepts valid token" "e2e@test.com" "$R"

# Admin login
R=$(curl -s -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vytoverse.com","password":"admin123"}')
check "Admin login" "access_token" "$R"
ADMIN_TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

# ---- Profile ----
echo ""
echo "3. USER PROFILE"
R=$(curl -s http://127.0.0.1:8000/users/me \
  -H "Authorization: Bearer $USER_TOKEN")
check "Get profile" "E2E Test User" "$R"

R=$(curl -s -X PUT http://127.0.0.1:8000/users/me \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"E2E Updated","bio":"Testing bio"}')
check "Update profile" "E2E Updated" "$R"
check "Bio updated" "Testing bio" "$R"

# ---- Authorization ----
echo ""
echo "4. AUTHORIZATION"
# User trying admin endpoint
R=$(curl -s http://127.0.0.1:8000/admin/users \
  -H "Authorization: Bearer $USER_TOKEN")
check "User cannot access admin endpoint" "Admin access required" "$R"

# Admin accessing admin endpoint
R=$(curl -s http://127.0.0.1:8000/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "Admin can access admin users" "E2E Updated" "$R"

# ---- Stars ----
echo ""
echo "5. STARS SYSTEM"
# Get test user ID
USER_ID=$(curl -s http://127.0.0.1:8000/auth/me \
  -H "Authorization: Bearer $USER_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

# Admin assigns stars
R=$(curl -s -X POST http://127.0.0.1:8000/admin/users/$USER_ID/stars \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stars":25}')
check "Admin assigns stars" '"stars":25' "$R"

# User cannot assign stars
R=$(curl -s -X POST http://127.0.0.1:8000/admin/users/$USER_ID/stars \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stars":99}')
check "User cannot assign stars" "Admin access required" "$R"

# ---- Events ----
echo ""
echo "6. EVENTS"
# List events (public)
R=$(curl -s http://127.0.0.1:8000/events)
check "List events (public)" "HackVerge" "$R"

# Create event (admin)
R=$(curl -s -X POST http://127.0.0.1:8000/admin/events \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Test Event","date":"2025-12-01","location":"Test Hall","status":"upcoming"}')
check "Admin creates event" "E2E Test Event" "$R"
EVENT_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

# User cannot create event
R=$(curl -s -X POST http://127.0.0.1:8000/admin/events \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Should Fail","date":"2025-12-01"}')
check "User cannot create event" "Admin access required" "$R"

# Get single event
R=$(curl -s http://127.0.0.1:8000/events/$EVENT_ID)
check "Get single event" "E2E Test Event" "$R"

# Update event
R=$(curl -s -X PUT http://127.0.0.1:8000/admin/events/$EVENT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Updated Event"}')
check "Admin updates event" "E2E Updated Event" "$R"

# Delete event
R=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE http://127.0.0.1:8000/admin/events/$EVENT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "Admin deletes event" "204" "$R"

# Verify deleted
R=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/events/$EVENT_ID)
check "Deleted event returns 404" "404" "$R"

# ---- Library ----
echo ""
echo "7. LIBRARY"
R=$(curl -s http://127.0.0.1:8000/library)
check "List library resources (public)" "Introduction to Data Structures" "$R"

R=$(curl -s http://127.0.0.1:8000/library/categories)
check "List categories" "Web Development" "$R"

# Create resource (admin)
R=$(curl -s -X POST http://127.0.0.1:8000/admin/library \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Test Resource","category":"Testing","resource_type":"tutorial","author":"E2E"}')
check "Admin creates resource" "E2E Test Resource" "$R"
RES_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

# User cannot create resource
R=$(curl -s -X POST http://127.0.0.1:8000/admin/library \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Should Fail","category":"X","resource_type":"pdf"}')
check "User cannot create resource" "Admin access required" "$R"

# Update resource
R=$(curl -s -X PUT http://127.0.0.1:8000/admin/library/$RES_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Updated Resource"}')
check "Admin updates resource" "E2E Updated Resource" "$R"

# Delete resource
R=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE http://127.0.0.1:8000/admin/library/$RES_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "Admin deletes resource" "204" "$R"

# ---- Stats ----
echo ""
echo "8. STATS"
R=$(curl -s http://127.0.0.1:8000/stats)
check "Stats endpoint returns data" "total_users" "$R"

# ---- API Docs ----
echo ""
echo "9. API DOCUMENTATION"
R=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/docs)
check "Swagger docs accessible" "200" "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/openapi.json)
check "OpenAPI schema accessible" "200" "$R"

# ---- Summary ----
echo ""
echo "======================================"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "======================================"

# Cleanup
kill $SERVER_PID 2>/dev/null || true
exit $FAIL
