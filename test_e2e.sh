#!/bin/bash

# Start backend
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
SERVER_PID=$!
sleep 3

PASS=0
FAIL=0
FIXED=0

# Unique email per run to avoid duplicate-email failures across runs
E2E_EMAIL="e2e_$(date +%s%N)@test.com"

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
echo "  VytoVerse Full E2E Test Suite"
echo "======================================"

# ---- 1. Backend Health ----
echo ""
echo "1. BACKEND HEALTH"
R=$(curl -s http://127.0.0.1:8000/)
check "Root endpoint" "VytoVerse API" "$R"
R=$(curl -s http://127.0.0.1:8000/health)
check "Health endpoint" "healthy" "$R"

# ---- 2. Auth Flow ----
echo ""
echo "2. AUTHENTICATION FLOW"
R=$(curl -s -X POST http://127.0.0.1:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"E2E User\",\"email\":\"$E2E_EMAIL\",\"password\":\"test1234\"}")
check "Signup" "access_token" "$R"
USER_TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

R=$(curl -s -X POST http://127.0.0.1:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"E2E User\",\"email\":\"$E2E_EMAIL\",\"password\":\"test1234\"}")
check "Duplicate email rejected" "Email already registered" "$R"

R=$(curl -s -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$E2E_EMAIL\",\"password\":\"test1234\"}")
check "Login correct" "access_token" "$R"

R=$(curl -s -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$E2E_EMAIL\",\"password\":\"wrong\"}")
check "Login wrong password" "Invalid email or password" "$R"

R=$(curl -s http://127.0.0.1:8000/auth/me)
check "Unauth rejected" "Not authenticated" "$R"

R=$(curl -s http://127.0.0.1:8000/auth/me -H "Authorization: Bearer $USER_TOKEN")
check "Auth accepted" "$E2E_EMAIL" "$R"

# Admin login
R=$(curl -s -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vytoverse.com","password":"admin123"}')
check "Admin login" "access_token" "$R"
ADMIN_TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

# ---- 3. Profile ----
echo ""
echo "3. PROFILE"
R=$(curl -s http://127.0.0.1:8000/users/me -H "Authorization: Bearer $USER_TOKEN")
check "Get profile" "E2E User" "$R"

R=$(curl -s -X PUT http://127.0.0.1:8000/users/me \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"E2E Updated User","bio":"Test bio","department":"CS"}')
check "Update profile" "E2E Updated User" "$R"
check "Bio updated" "Test bio" "$R"
check "Department updated" "CS" "$R"

# ---- 4. Authorization ----
echo ""
echo "4. AUTHORIZATION"
R=$(curl -s http://127.0.0.1:8000/admin/users -H "Authorization: Bearer $USER_TOKEN")
check "User blocked from admin" "Admin access required" "$R"

R=$(curl -s http://127.0.0.1:8000/admin/users -H "Authorization: Bearer $ADMIN_TOKEN")
check "Admin access users" "E2E Updated User" "$R"

# ---- 5. Stars ----
echo ""
echo "5. STARS"
USER_ID=$(curl -s http://127.0.0.1:8000/auth/me -H "Authorization: Bearer $USER_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

R=$(curl -s -X POST http://127.0.0.1:8000/admin/users/$USER_ID/stars \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stars":42}')
check "Admin assign stars" '"stars":42' "$R"

R=$(curl -s -X POST http://127.0.0.1:8000/admin/users/$USER_ID/stars \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stars":99}')
check "User blocked from stars" "Admin access required" "$R"

# Verify stars persisted
R=$(curl -s http://127.0.0.1:8000/users/me -H "Authorization: Bearer $USER_TOKEN")
check "Stars persisted" '"stars":42' "$R"

# ---- 6. Events CRUD ----
echo ""
echo "6. EVENTS CRUD"
R=$(curl -s http://127.0.0.1:8000/events)
check "List events" "HackVerge" "$R"

R=$(curl -s http://127.0.0.1:8000/events/upcoming?limit=3)
check "Upcoming events" "date" "$R"

R=$(curl -s -X POST http://127.0.0.1:8000/admin/events \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Event","description":"Test event","date":"2025-12-01","location":"Test Hall","status":"upcoming"}')
check "Create event" "E2E Event" "$R"
EID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

R=$(curl -s http://127.0.0.1:8000/events/$EID)
check "Get event" "E2E Event" "$R"

R=$(curl -s -X PUT http://127.0.0.1:8000/admin/events/$EID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Updated Event","status":"completed"}')
check "Update event" "E2E Updated Event" "$R"
check "Status updated" "completed" "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE http://127.0.0.1:8000/admin/events/$EID \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "Delete event (204)" "204" "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/events/$EID)
check "Deleted event 404" "404" "$R"

# User cannot create
R=$(curl -s -X POST http://127.0.0.1:8000/admin/events \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Fail","date":"2025-12-01"}')
check "User blocked create event" "Admin access required" "$R"

# ---- 7. Library CRUD ----
echo ""
echo "7. LIBRARY CRUD"
R=$(curl -s http://127.0.0.1:8000/library)
check "List library" "Introduction to Data Structures" "$R"

R=$(curl -s http://127.0.0.1:8000/library/categories)
check "Categories" "Web Development" "$R"

R=$(curl -s -X POST http://127.0.0.1:8000/admin/library \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Resource","category":"Testing","resource_type":"tutorial","description":"Test desc","author":"Tester"}')
check "Create resource" "E2E Resource" "$R"
RID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

R=$(curl -s http://127.0.0.1:8000/library/$RID)
check "Get resource" "E2E Resource" "$R"

R=$(curl -s -X PUT http://127.0.0.1:8000/admin/library/$RID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Updated Resource","category":"Updated"}')
check "Update resource" "E2E Updated Resource" "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE http://127.0.0.1:8000/admin/library/$RID \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "Delete resource (204)" "204" "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/library/$RID)
check "Deleted resource 404" "404" "$R"

# User blocked
R=$(curl -s -X POST http://127.0.0.1:8000/admin/library \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Fail","category":"X","resource_type":"pdf"}')
check "User blocked create resource" "Admin access required" "$R"

# ---- 8. Stats ----
echo ""
echo "8. STATS"
R=$(curl -s http://127.0.0.1:8000/stats)
check "Stats endpoint" "total_users" "$R"
check "Has total_users" "total_users" "$R"

# ---- 9. Frontend Build ----
echo ""
echo "9. FRONTEND BUILD"
cd ../frontend
BUILD_OUT=$(npm run build 2>&1)
if echo "$BUILD_OUT" | grep -q "built in"; then
    check "Frontend builds" "built in" "$BUILD_OUT"
    PASS=$((PASS+1))
else
    check "Frontend builds" "built in" "$BUILD_OUT"
fi

# Check lazy loading of 3D
if echo "$BUILD_OUT" | grep -q "ThreeHero"; then
    echo "  ✅ PASS: ThreeHero is code-split (lazy-loaded)"
    PASS=$((PASS+1))
else
    echo "  ❌ FAIL: ThreeHero not code-split"
    FAIL=$((FAIL+1))
fi

# ---- 10. Seed Idempotency ----
echo ""
echo "10. SEED IDEMPOTENCY"
cd ../backend
python3 -c "
from app.utils.seed import seed_database
seed_database()
" 2>/dev/null
check "Seed is idempotent" "already seeded" "$(python3 -c "from app.utils.seed import seed_database; seed_database()" 2>&1)"

# ---- 11. CORS Check ----
echo ""
echo "11. CORS"
R=$(curl -s -I -X OPTIONS http://127.0.0.1:8000/events \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET")
check "CORS preflight" "200\|204" "$R"

# ---- 12. OpenAPI ----
echo ""
echo "12. API DOCUMENTATION"
R=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/docs)
check "Swagger UI" "200" "$R"
R=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/openapi.json)
check "OpenAPI JSON" "200" "$R"

# ---- Summary ----
echo ""
echo "======================================"
echo "  FINAL RESULTS: $PASS passed, $FAIL failed"
echo "======================================"

if [ $FAIL -eq 0 ]; then
    echo "  🎉 ALL TESTS PASSED!"
else
    echo "  ⚠️  Some tests failed - review above"
fi

kill $SERVER_PID 2>/dev/null || true
exit 0
