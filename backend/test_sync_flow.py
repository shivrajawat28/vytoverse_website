import os
import sys

# Use an isolated SQLite database for testing
os.environ["DATABASE_URL"] = "sqlite:///./test_sync.db"

from starlette.testclient import TestClient
from app.main import app
from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.utils.seed import seed_database

def run_tests():
    print("==================================================")
    print("  RUNNING TEAM & ROLE SYNCHRONIZATION TESTS")
    print("==================================================")

    # 1. Seed database
    seed_database()
    client = TestClient(app)
    db = SessionLocal()
    try:
        # 2. Login as admin
        login_res = client.post("/auth/login", json={"email": "admin@vytoverse.com", "password": "admin123"})
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ 1. Admin login successful")

        # Fetch users
        users_res = client.get("/admin/users?limit=100", headers=headers)
        assert users_res.status_code == 200
        all_users = users_res.json()
        non_admins = [u for u in all_users if u["role"] == "user"]
        assert len(non_admins) >= 4, "Need at least 4 regular users for tests"

        user_a = non_admins[0]
        user_b = non_admins[1]
        user_c = non_admins[2]
        user_d = non_admins[3]

        # TEST 1: Admin assigns Designation = "President"
        res = client.put(f"/admin/users/{user_a['id']}/team", headers=headers, json={"team_membership": 1, "team_role": "President"})
        assert res.status_code == 200, f"Failed setting President: {res.text}"
        data = res.json()
        assert data["role"] == "president", f"Expected role 'president', got {data['role']}"
        assert data["team_role"] == "President"
        assert data["team_membership"] == 1

        # Verify DB directly
        db.expire_all()
        db_user_a = db.query(User).filter(User.id == user_a['id']).first()
        assert db_user_a.role == UserRole.PRESIDENT, f"DB role mismatch: {db_user_a.role}"
        print(f"✅ 2. Admin assigned Designation='President' -> DB role={db_user_a.role.value}, team_role='{db_user_a.team_role}'")

        # TEST 2: Admin assigns Designation = "Vice President"
        res = client.put(f"/admin/users/{user_b['id']}/team", headers=headers, json={"team_membership": 1, "team_role": "Vice President"})
        assert res.status_code == 200, f"Failed setting Vice President: {res.text}"
        data = res.json()
        assert data["role"] == "vice_president", f"Expected role 'vice_president', got {data['role']}"
        assert data["team_role"] == "Vice President"
        assert data["team_membership"] == 1

        db.expire_all()
        db_user_b = db.query(User).filter(User.id == user_b['id']).first()
        assert db_user_b.role == UserRole.VICE_PRESIDENT, f"DB role mismatch: {db_user_b.role}"
        print(f"✅ 3. Admin assigned Designation='Vice President' -> DB role={db_user_b.role.value}, team_role='{db_user_b.team_role}'")

        # TEST 3: MULTIPLE Presidents! Admin assigns Designation = "president" (case test) to User C
        res = client.put(f"/admin/users/{user_c['id']}/team", headers=headers, json={"team_membership": 1, "team_role": "president"})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "president"
        assert data["team_role"] == "President"

        db.expire_all()
        db_user_c = db.query(User).filter(User.id == user_c['id']).first()
        assert db_user_c.role == UserRole.PRESIDENT
        print(f"✅ 4. Multiple Presidents supported: User A ({user_a['name']}) and User C ({user_c['name']}) are both role=president")

        # TEST 4: MULTIPLE Vice Presidents! Admin assigns Designation = "vice president" to User D
        res = client.put(f"/admin/users/{user_d['id']}/team", headers=headers, json={"team_membership": 1, "team_role": "vice president"})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "vice_president"
        assert data["team_role"] == "Vice President"

        db.expire_all()
        db_user_d = db.query(User).filter(User.id == user_d['id']).first()
        assert db_user_d.role == UserRole.VICE_PRESIDENT
        print(f"✅ 5. Multiple Vice Presidents supported: User B ({user_b['name']}) and User D ({user_d['name']}) are both role=vice_president")

        # TEST 5: Verify /team endpoint classifies them properly
        team_res = client.get("/team")
        assert team_res.status_code == 200
        team_list = team_res.json()
        presidents = [m for m in team_list if m["role"] == "president"]
        vps = [m for m in team_list if m["role"] == "vice_president"]
        members = [m for m in team_list if m["role"] != "president" and m["role"] != "vice_president"]

        pres_ids = [p["id"] for p in presidents]
        assert user_a["id"] in pres_ids and user_c["id"] in pres_ids, "Both presidents must be in presidents list"
        vp_ids = [v["id"] for v in vps]
        assert user_b["id"] in vp_ids and user_d["id"] in vp_ids, "Both VPs must be in vice_presidents list"

        # Verify no President or VP appears in Team Members
        member_ids = [m["id"] for m in members]
        assert user_a["id"] not in member_ids
        assert user_b["id"] not in member_ids
        assert user_c["id"] not in member_ids
        assert user_d["id"] not in member_ids
        print(f"✅ 6. /team API verification: {len(presidents)} Presidents, {len(vps)} Vice Presidents, {len(members)} Team Members. Zero overlap!")

        # TEST 6: Change President back to another designation (e.g. "Frontend Lead")
        res = client.put(f"/admin/users/{user_a['id']}/team", headers=headers, json={"team_membership": 1, "team_role": "Frontend Lead"})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "user", f"Expected demotion to 'user', got {data['role']}"
        assert data["team_role"] == "Frontend Lead"
        assert data["team_membership"] == 1

        db.expire_all()
        db_user_a = db.query(User).filter(User.id == user_a['id']).first()
        assert db_user_a.role == UserRole.USER
        print(f"✅ 7. President changed to 'Frontend Lead' -> DB role={db_user_a.role.value}, returned to Team Members")

        # TEST 7: Remove Vice President from team entirely
        res = client.put(f"/admin/users/{user_b['id']}/team", headers=headers, json={"team_membership": 0})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "user"
        assert data["team_role"] is None
        assert data["team_membership"] == 0

        db.expire_all()
        db_user_b = db.query(User).filter(User.id == user_b['id']).first()
        assert db_user_b.role == UserRole.USER
        assert db_user_b.team_membership == 0
        print(f"✅ 8. Vice President removed from team -> DB role={db_user_b.role.value}, team_membership=0")

        # TEST 8: Verify /team reflects these changes
        team_res2 = client.get("/team")
        team_list2 = team_res2.json()
        pres_ids2 = [p["id"] for p in team_list2 if p["role"] == "president"]
        vp_ids2 = [v["id"] for v in team_list2 if v["role"] == "vice_president"]
        member_ids2 = [m["id"] for m in team_list2 if m["role"] != "president" and m["role"] != "vice_president"]

        assert user_a["id"] not in pres_ids2, "User A should no longer be in presidents"
        assert user_a["id"] in member_ids2, "User A should now be in team members"
        assert user_b["id"] not in pres_ids2 and user_b["id"] not in vp_ids2 and user_b["id"] not in member_ids2, "User B should be removed from /team"
        print("✅ 9. /team accurately updated after leadership demotion & removal")

        # TEST 9: Preserve ADMIN privileges - Admin user must NOT be downgraded
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        assert admin_user is not None
        admin_id = admin_user.id

        # Admin given a team role
        res = client.put(f"/admin/users/{admin_id}/team", headers=headers, json={"team_membership": 1, "team_role": "Technical Lead"})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "admin", f"Admin was accidentally downgraded to {data['role']}"

        # Admin removed from team
        res = client.put(f"/admin/users/{admin_id}/team", headers=headers, json={"team_membership": 0})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "admin", f"Admin was accidentally downgraded to {data['role']}"

        db.expire_all()
        db_admin = db.query(User).filter(User.id == admin_id).first()
        assert db_admin.role == UserRole.ADMIN
        print(f"✅ 10. Admin role security: Admin user was NOT downgraded to 'user' when managing team status (role={db_admin.role.value})")

        # TEST 10: Assigning role directly via /admin/users/{id}/role
        res = client.put(f"/admin/users/{user_a['id']}/role", headers=headers, json={"role": "president"})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "president"
        assert data["team_role"] == "President"
        assert data["team_membership"] == 1
        print("✅ 11. Role assignment via /admin/users/{id}/role syncs team_role='President' and team_membership=1")

    finally:
        db.close()
        if os.path.exists("./test_sync.db"):
            os.remove("./test_sync.db")

    print("\n🎉 ALL 11 TEST VERIFICATIONS PASSED!")

if __name__ == "__main__":
    run_tests()
