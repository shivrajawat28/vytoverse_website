#!/bin/bash
set -e
cd "$(dirname "$0")/backend"
PASS=0
FAIL=0
API="http://127.0.0.1:8000"
# Unique email per run to avoid duplicates
EMAIL="test_$(date +%s)@team.com"

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✓ $desc"
    PASS=$((PASS+1))
  else
    echo "  ✗ $desc (expected='$expected' actual='$actual')"
    FAIL=$((FAIL+1))
  fi
}

echo "=== Starting Backend ==="
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level warning &
BPID=$!
sleep 3

echo "=== Seed Database ==="
python -c "from app.utils.seed import seed_database; seed_database()" 2>&1 | tail -1
echo ""

# ── AUTH ──
echo "=== Authentication ==="
RES=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"$EMAIL\",\"password\":\"pass123\",\"username\":\"testuser_$(date +%s)\"}")
CODE=$(echo "$RES" | tail -1)
check "Signup new user" "201" "$CODE"

RES=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Dup\",\"email\":\"$EMAIL\",\"password\":\"pass123\"}")
CODE=$(echo "$RES" | tail -1)
check "Duplicate email rejected" "400" "$CODE"

RES=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"pass123\"}")
CODE=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | sed '$d')
TOKEN=$(echo "$BODY" | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
check "Login" "200" "$CODE"

RES=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vytoverse.com","password":"admin123"}')
CODE=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | sed '$d')
ADMIN_TOKEN=$(echo "$BODY" | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
check "Admin login" "200" "$CODE"

RES=$(curl -s -w "\n%{http_code}" "$API/auth/me" -H "Authorization: Bearer $TOKEN")
CODE=$(echo "$RES" | tail -1)
check "Get /auth/me" "200" "$CODE"

RES=$(curl -s -w "\n%{http_code}" "$API/auth/me")
CODE=$(echo "$RES" | tail -1)
check "Unauth /auth/me" "401" "$CODE"

RES=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"wrongpass\"}")
CODE=$(echo "$RES" | tail -1)
check "Wrong password rejected" "401" "$CODE"
echo ""

# ── TEAM MANAGEMENT ──
echo "=== Team Management ==="
RES=$(curl -s "$API/admin/users" -H "Authorization: Bearer $ADMIN_TOKEN")
USER_ID=$(echo "$RES" | python -c "import sys,json; users=json.load(sys.stdin); print(next(u['id'] for u in users if u['email']=='$EMAIL'))" 2>/dev/null)
echo "  Test user ID: $USER_ID"

# Make team member with role
RES=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/users/$USER_ID/team" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"team_membership": 1, "team_role": "Frontend Lead"}')
CODE=$(echo "$RES" | tail -1)
check "Admin: make team member with role" "200" "$CODE"

RES=$(curl -s "$API/team")
HAS_TEST=$(echo "$RES" | python -c "import sys,json; ms=json.load(sys.stdin); print('yes' if any(m['email']=='$EMAIL' for m in ms) else 'no')" 2>/dev/null)
check "User appears in /team" "yes" "$HAS_TEST"

ROLE=$(echo "$RES" | python -c "import sys,json; ms=json.load(sys.stdin); m=next((x for x in ms if x['email']=='$EMAIL'),{}); print(m.get('team_role',''))" 2>/dev/null)
check "Team role = Frontend Lead" "Frontend Lead" "$ROLE"

TM=$(echo "$RES" | python -c "import sys,json; ms=json.load(sys.stdin); m=next((x for x in ms if x['email']=='$EMAIL'),{}); print(m.get('team_membership',0))" 2>/dev/null)
check "team_membership = 1" "1" "$TM"

# Change role
RES=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/users/$USER_ID/team" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"team_membership": 1, "team_role": "AI/ML Lead"}')
CODE=$(echo "$RES" | tail -1)
check "Admin: change role" "200" "$CODE"

RES=$(curl -s "$API/team")
ROLE=$(echo "$RES" | python -c "import sys,json; ms=json.load(sys.stdin); m=next((x for x in ms if x['email']=='$EMAIL'),{}); print(m.get('team_role',''))" 2>/dev/null)
check "Role changed to AI/ML Lead" "AI/ML Lead" "$ROLE"

# Empty role rejected
RES=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/users/$USER_ID/team" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"team_membership": 1, "team_role": ""}')
CODE=$(echo "$RES" | tail -1)
check "Empty role rejected" "400" "$CODE"

# Whitespace-only role rejected
RES=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/users/$USER_ID/team" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"team_membership": 1, "team_role": "   "}')
CODE=$(echo "$RES" | tail -1)
check "Whitespace role rejected" "400" "$CODE"

# Too long role rejected
LONG_ROLE=$(python -c "print('A'*101)")
RES=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/users/$USER_ID/team" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"team_membership\": 1, \"team_role\": \"$LONG_ROLE\"}")
CODE=$(echo "$RES" | tail -1)
check "Long role rejected" "400" "$CODE"

# Remove from team
RES=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/users/$USER_ID/team" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"team_membership": 0}')
CODE=$(echo "$RES" | tail -1)
check "Admin: remove from team" "200" "$CODE"

RES=$(curl -s "$API/team")
HAS_TEST=$(echo "$RES" | python -c "import sys,json; ms=json.load(sys.stdin); print('yes' if any(m['email']=='$EMAIL' for m in ms) else 'no')" 2>/dev/null)
check "User removed from /team" "no" "$HAS_TEST"

# Role cleared after removal — use None comparison
BODY=$(curl -s "$API/admin/users" -H "Authorization: Bearer $ADMIN_TOKEN")
ROLE_AFTER=$(echo "$BODY" | python -c "
import sys,json
users = json.load(sys.stdin)
u = next((x for x in users if x['email']=='$EMAIL'), {})
r = u.get('team_role')
print('cleared' if r is None else r)
" 2>/dev/null)
check "Role cleared after removal" "cleared" "$ROLE_AFTER"

# Non-admin can't toggle team
RES=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/users/$USER_ID/team" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"team_membership": 1, "team_role": "Member"}')
CODE=$(echo "$RES" | tail -1)
check "Non-admin team toggle blocked" "403" "$CODE"
echo ""

# ── PHOTO UPLOAD ──
echo "=== Photo Upload ==="
python -c "
data = bytes.fromhex('ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9fa1ffa9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffda000801010000003f007fb0006ffdd00040001ffd9')
with open('/tmp/test_photo.jpg', 'wb') as f:
    f.write(data)
"

RES=$(curl -s -w "\n%{http_code}" -X POST "$API/users/me/profile-image" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_photo.jpg")
CODE=$(echo "$RES" | tail -1)
check "Valid image upload" "200" "$CODE"

echo "not an image" > /tmp/test_file.txt
RES=$(curl -s -w "\n%{http_code}" -X POST "$API/users/me/profile-image" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_file.txt")
CODE=$(echo "$RES" | tail -1)
check "Invalid file type rejected" "400" "$CODE"

dd if=/dev/zero bs=1M count=6 2>/dev/null | cat /tmp/test_photo.jpg - > /tmp/big_photo.jpg
RES=$(curl -s -w "\n%{http_code}" -X POST "$API/users/me/profile-image" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/big_photo.jpg")
CODE=$(echo "$RES" | tail -1)
check "Oversized image rejected" "400" "$CODE"

RES=$(curl -s -w "\n%{http_code}" "$API/users/me" -H "Authorization: Bearer $TOKEN")
CODE=$(echo "$RES" | tail -1)
IMG=$(echo "$RES" | sed '$d' | python -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('profile_image') else 'no')" 2>/dev/null)
check "Profile image persisted" "yes" "$IMG"
echo ""

# ── EVENTS ──
echo "=== Events CRUD ==="
RES=$(curl -s -w "\n%{http_code}" "$API/events")
CODE=$(echo "$RES" | tail -1)
check "List events" "200" "$CODE"

RES=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/events" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Event","description":"Test","date":"2026-09-01","time":"10:00","location":"Room 101","status":"upcoming"}')
CODE=$(echo "$RES" | tail -1)
EV_ID=$(echo "$RES" | sed '$d' | python -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
check "Create event" "201" "$CODE"

RES=$(curl -s -w "\n%{http_code}" "$API/events/$EV_ID")
CODE=$(echo "$RES" | tail -1)
check "Get event" "200" "$CODE"

RES=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/events/$EV_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated E2E Event"}')
CODE=$(echo "$RES" | tail -1)
check "Update event" "200" "$CODE"

RES=$(curl -s -w "\n%{http_code}" -X DELETE "$API/admin/events/$EV_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
CODE=$(echo "$RES" | tail -1)
check "Delete event" "204" "$CODE"

RES=$(curl -s -w "\n%{http_code}" "$API/events/99999")
CODE=$(echo "$RES" | tail -1)
check "Get nonexistent event" "404" "$CODE"

RES=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Nope"}')
CODE=$(echo "$RES" | tail -1)
check "Non-admin create event blocked" "403" "$CODE"
echo ""

# ── LIBRARY ──
echo "=== Library CRUD ==="
RES=$(curl -s -w "\n%{http_code}" "$API/library")
CODE=$(echo "$RES" | tail -1)
check "List library" "200" "$CODE"

RES=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/library" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Resource","description":"Test","category":"notes","resource_type":"pdf"}')
CODE=$(echo "$RES" | tail -1)
LIB_ID=$(echo "$RES" | sed '$d' | python -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
check "Create library resource" "201" "$CODE"

RES=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/library/$LIB_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Resource"}')
CODE=$(echo "$RES" | tail -1)
check "Update library resource" "200" "$CODE"

RES=$(curl -s -w "\n%{http_code}" -X DELETE "$API/admin/library/$LIB_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
CODE=$(echo "$RES" | tail -1)
check "Delete library resource" "204" "$CODE"

RES=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/library" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Nope"}')
CODE=$(echo "$RES" | tail -1)
check "Non-admin create library blocked" "403" "$CODE"
echo ""

# ── TEAM ENDPOINT ──
echo "=== Team Endpoint ==="
RES=$(curl -s -w "\n%{http_code}" "$API/team")
CODE=$(echo "$RES" | tail -1)
COUNT=$(echo "$RES" | sed '$d' | python -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
check "GET /team" "200" "$CODE"
echo "  Team members: $COUNT"

FIELDS_OK=$(echo "$RES" | sed '$d' | python -c "
import sys,json
members = json.load(sys.stdin)
if not members:
    print('no-members'); sys.exit()
m = members[0]
required = ['id','name','team_role','team_membership','email','role']
missing = [k for k in required if k not in m]
if missing:
    print('missing:' + ','.join(missing))
else:
    print('yes')
" 2>/dev/null)
check "Team response has required fields" "yes" "$FIELDS_OK"

NO_HASH=$(echo "$RES" | sed '$d' | python -c "
import sys,json
members = json.load(sys.stdin)
print('yes' if not any('password_hash' in m for m in members) else 'no')
" 2>/dev/null)
check "No password_hash in /team" "yes" "$NO_HASH"
echo ""

# ── STATS ──
echo "=== Stats ==="
RES=$(curl -s -w "\n%{http_code}" "$API/stats")
CODE=$(echo "$RES" | tail -1)
check "Stats endpoint" "200" "$CODE"
echo ""

# ── PROFILE ──
echo "=== Profile ==="
RES=$(curl -s -w "\n%{http_code}" -X PUT "$API/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio":"Updated bio","department":"CS"}')
CODE=$(echo "$RES" | tail -1)
check "Update profile" "200" "$CODE"

RES=$(curl -s "$API/users/me" -H "Authorization: Bearer $TOKEN")
BIO=$(echo "$RES" | python -c "import sys,json; print(json.load(sys.stdin).get('bio',''))" 2>/dev/null)
check "Bio persisted" "Updated bio" "$BIO"
echo ""

# ── STARS ──
echo "=== Stars ==="
RES=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/users/$USER_ID/stars" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stars": 42}')
CODE=$(echo "$RES" | tail -1)
check "Admin assign stars" "200" "$CODE"

STARS=$(echo "$RES" | sed '$d' | python -c "import sys,json; print(json.load(sys.stdin).get('stars',0))" 2>/dev/null)
check "Stars = 42" "42" "$STARS"

RES=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/users/$USER_ID/stars" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stars": 0}')
CODE=$(echo "$RES" | tail -1)
check "Non-admin stars blocked" "403" "$CODE"
echo ""

# ── CORS ──
echo "=== CORS ==="
RES=$(curl -s -w "\n%{http_code}" -X OPTIONS "$API/auth/login" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST")
CODE=$(echo "$RES" | tail -1)
check "CORS preflight" "200" "$CODE"
echo ""

# ── SUMMARY ──
kill $BPID 2>/dev/null
echo "================================"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "================================"
[ $FAIL -eq 0 ] && echo "🎉 All tests passed!" || echo "⚠ Some tests failed."
