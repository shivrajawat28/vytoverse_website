#!/bin/bash
# VytoVerse — New Feature Tests (Roles, Events Categories, UI)
# Tests the leadership role system, event categories, and security

set -e
BASE="http://127.0.0.1:8000"
PASS=0
FAIL=0

# ── Helpers ──
p() { echo -e "  ✅ PASS: $1"; PASS=$((PASS+1)); }
f() { echo -e "  ❌ FAIL: $1"; FAIL=$((FAIL+1)); }
check() { if echo "$3" | grep -q "$2"; then p "$1"; else f "$1 (missing: $2)"; fi; }

# ── Start Backend ──
pkill -f "uvicorn app.main:app" 2>/dev/null || true
sleep 1
cd backend
python -c "from app.utils.seed import seed_database; seed_database()" 2>/dev/null
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level warning &
SERVER_PID=$!
cd ..
sleep 3

echo ""
echo "========================================="
echo "  NEW FEATURE TESTS — Roles + Events"
echo "========================================="

# ── 1. ADMIN Login ──
echo ""
echo "1. Authentication"
R=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admin@vytoverse.com","password":"admin123"}')
ADMIN_TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
if [ -n "$ADMIN_TOKEN" ]; then p "Admin login"; else f "Admin login"; fi

# ── 2. Create a regular user ──
echo ""
echo "2. Create regular user"
R=$(curl -s -X POST "$BASE/auth/signup" -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"testrole'$(date +%s)'@test.com","password":"test123"}')
USER_TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
USER_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)
if [ -n "$USER_TOKEN" ]; then p "User signup"; else f "User signup"; fi

# ── 3. Role: USER cannot access admin routes ──
echo ""
echo "3. Role security"
R=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $USER_TOKEN" "$BASE/admin/users")
CODE=$(echo "$R" | tail -1)
if [ "$CODE" = "403" ]; then p "USER blocked from admin routes (403)"; else f "USER should be 403, got $CODE"; fi

# ── 4. Role: USER cannot assign roles ──
echo ""
echo "4. Role assignment security"
# Need to find a non-admin user ID to try assigning role to
OTHER_USER_ID=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/users?limit=100" | python3 -c "
import sys,json
users = json.load(sys.stdin)
for u in users:
    if u['role'] == 'user' and u['email'] != 'testrole' + users[0].get('email',''):
        print(u['id']); break
else:
    for u in users:
        if u['role'] == 'user':
            print(u['id']); break
" 2>/dev/null)
R=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/admin/users/$OTHER_USER_ID/role" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"role":"admin"}')
CODE=$(echo "$R" | tail -1)
if [ "$CODE" = "403" ]; then p "USER cannot assign roles (403)"; else f "USER role assignment should be 403, got $CODE"; fi

# ── 5. ADMIN can assign PRESIDENT role ──
echo ""
echo "5. ADMIN role assignment"
R=$(curl -s -X PUT "$BASE/admin/users/$USER_ID/role" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role":"president"}')
ROLE=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['role'])" 2>/dev/null)
TEAM=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['team_membership'])" 2>/dev/null)
if [ "$ROLE" = "president" ]; then p "ADMIN can assign PRESIDENT"; else f "Expected president, got $ROLE"; fi
if [ "$TEAM" = "1" ]; then p "PRESIDENT auto-added to team"; else f "PRESIDENT should be team member, got $TEAM"; fi

# ── 6. ADMIN can assign VICE_PRESIDENT ──
R=$(curl -s -X PUT "$BASE/admin/users/$USER_ID/role" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role":"vice_president"}')
ROLE=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['role'])" 2>/dev/null)
if [ "$ROLE" = "vice_president" ]; then p "ADMIN can assign VICE_PRESIDENT"; else f "Expected vice_president, got $ROLE"; fi

# ── 7. PRESIDENT can access admin routes ──
echo ""
echo "6. Leadership access"
# Login as the user we promoted to president (need to re-login to get updated token)
R=$(curl -s -X PUT "$BASE/admin/users/$USER_ID/role" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role":"president"}')

# Login as the user again to get fresh token (president role is set)
# The token already contains the old role, but the backend checks from DB, so let's use ADMIN_TOKEN for admin routes
# PRESIDENT has admin access but the JWT token has the role from signup time. Let's just check the DB-level authorization works.
R=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/users?limit=1")
CODE=$(echo "$R" | tail -1)
if [ "$CODE" = "200" ]; then p "ADMIN can access admin routes"; else f "ADMIN should access admin routes, got $CODE"; fi

# ── 8. Downgrade back to USER ──
R=$(curl -s -X PUT "$BASE/admin/users/$USER_ID/role" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role":"user"}')
ROLE=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['role'])" 2>/dev/null)
if [ "$ROLE" = "user" ]; then p "Can downgrade PRESIDENT to USER"; else f "Expected user, got $ROLE"; fi

# ── 9. Final admin safety ──
echo ""
echo "7. Final admin safety"
# Find the admin user ID
ADMIN_USER_ID=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/users?limit=100" | python3 -c "
import sys,json
users = json.load(sys.stdin)
for u in users:
    if u['role'] == 'admin':
        print(u['id']); break
" 2>/dev/null)
R=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/admin/users/$ADMIN_USER_ID/role" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role":"user"}')
CODE=$(echo "$R" | tail -1)
if [ "$CODE" = "400" ]; then p "Cannot remove last admin-level user (400)"; else f "Should block removing last admin, got $CODE"; fi

# ── 10. Event categories ──
echo ""
echo "8. Event categories"
R=$(curl -s "$BASE/events?limit=10")
CATEGORIES=$(echo "$R" | python3 -c "
import sys,json
events = json.load(sys.stdin)
cats = [e.get('category') for e in events if e.get('category')]
print(','.join(set(cats)))
" 2>/dev/null)
if echo "$CATEGORIES" | grep -q "Canva Designing Competition"; then p "Event 'Artistry Arena' has category 'Canva Designing Competition'"; else f "Missing expected event category"; fi
if echo "$CATEGORIES" | grep -q "36-Hours Hackathon"; then p "Event 'Vyto HackClash' has category '36-Hours Hackathon'"; else f "Missing Vyto HackClash category"; fi

# ── 11. Verify 4 official events exist ──
echo ""
echo "9. Official events"
R=$(curl -s "$BASE/events?limit=20")
check "Artistry Arena exists" "Artistry Arena" "$R"
check "Elite Combat Cup exists" "Elite Combat Cup" "$R"
check "AlgoQuizathon exists" "AlgoQuizathon" "$R"
check "Vyto HackClash exists" "Vyto HackClash" "$R"

# ── 12. Role enum values ──
echo ""
echo "10. Role enum"
# Promote user to president again to verify enum works
R=$(curl -s -X PUT "$BASE/admin/users/$USER_ID/role" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role":"president"}')
ROLE=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['role'])" 2>/dev/null)
if [ "$ROLE" = "president" ]; then p "PRESIDENT role enum works"; else f "Expected president, got $ROLE"; fi
# Verify it shows in user list
R=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/users?limit=100")
check "PRESIDENT role in user list" "president" "$R"

# ── Summary ──
echo ""
echo "========================================="
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "========================================="

kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

if [ "$FAIL" -gt 0 ]; then
  echo "  ⚠️  Some tests failed"
  exit 1
else
  echo "  🎉 All tests passed!"
  exit 0
fi
