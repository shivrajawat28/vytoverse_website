from datetime import date, time, timedelta
from ..database import SessionLocal, engine, Base
from ..models.user import User, UserRole
from ..models.event import Event, EventStatus
from ..models.library import LibraryResource, ResourceType
from ..auth.password import hash_password


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing_admin = db.query(User).filter(User.email == "admin@vytoverse.com").first()
        if existing_admin:
            print("Database already seeded. Skipping.")
            return

        # Create admin
        admin = User(
            name="VytoVerse Admin",
            username="admin",
            email="admin@vytoverse.com",
            password_hash=hash_password("admin123"),
            role=UserRole.ADMIN,
            stars=50,
            bio="Platform administrator and founder of VytoVerse",
            department="Computer Science",
            team_membership=1,
            team_role="President",
        )
        db.add(admin)

        # Create users
        users_data = [
            {
                "name": "Aarav Sharma",
                "username": "aarav",
                "email": "aarav@example.com",
                "bio": "Full-stack developer passionate about AI and ML",
                "department": "Computer Science",
                "stars": 12,
            },
            {
                "name": "Priya Patel",
                "username": "priya",
                "email": "priya@example.com",
                "bio": "UI/UX designer and creative technologist",
                "department": "Design",
                "stars": 8,
            },
            {
                "name": "Rohan Mehta",
                "username": "rohan",
                "email": "rohan@example.com",
                "bio": "Backend engineer specializing in distributed systems",
                "department": "Computer Science",
                "stars": 15,
            },
            {
                "name": "Sneha Reddy",
                "username": "sneha",
                "email": "sneha@example.com",
                "bio": "Cybersecurity enthusiast and CTF player",
                "department": "Information Security",
                "stars": 10,
            },
            {
                "name": "Vikram Singh",
                "username": "vikram",
                "email": "vikram@example.com",
                "bio": "Mobile app developer and open source contributor",
                "department": "Computer Science",
                "stars": 7,
            },
            {
                "name": "Ananya Gupta",
                "username": "ananya",
                "email": "ananya@example.com",
                "bio": "Data science researcher and visualization expert",
                "department": "Data Science",
                "stars": 11,
            },
        ]

        team_roles = {
            0: "Technical Lead",
            1: "Design Lead",
            2: "Backend Lead",
            5: "AI/ML Lead",
        }
        users = []
        team_member_indices = [0, 1, 2, 5]  # Aarav, Priya, Rohan, Ananya are team members
        for i, u in enumerate(users_data):
            user = User(
                name=u["name"],
                username=u["username"],
                email=u["email"],
                password_hash=hash_password("password123"),
                role=UserRole.USER,
                bio=u["bio"],
                department=u["department"],
                stars=u["stars"],
                team_membership=1 if i in team_member_indices else 0,
                team_role=team_roles.get(i),
            )
            db.add(user)
            users.append(user)

        db.flush()

        # Create events — 4 official VytoVerse events
        today = date.today()
        events_data = [
            {
                "title": "Artistry Arena",
                "description": "A Canva Designing Competition showcasing creativity and design skills. Participants create stunning designs using Canva, competing for recognition and prizes. Open to all skill levels.",
                "short_description": "Canva Designing Competition",
                "category": "Canva Designing Competition",
                "date": today + timedelta(days=14),
                "time_start": time(10, 0),
                "time_end": time(13, 0),
                "location": "Design Lab, Block B",
                "status": EventStatus.UPCOMING,
                "max_participants": 100,
            },
            {
                "title": "Elite Combat Cup",
                "description": "An exciting Gaming Tournament bringing together competitive gamers. Multiple game titles, bracket-style elimination, and prizes for top performers.",
                "short_description": "Gaming Tournament",
                "category": "Gaming Tournament",
                "date": today + timedelta(days=21),
                "time_start": time(14, 0),
                "time_end": time(20, 0),
                "location": "Gaming Arena, Block C",
                "status": EventStatus.UPCOMING,
                "max_participants": 64,
            },
            {
                "title": "AlgoQuizathon",
                "description": "A Programming Tech Quiz testing algorithmic thinking, data structures, and general programming knowledge. Individual and team rounds with challenging problems.",
                "short_description": "Programming Tech Quiz",
                "category": "Programming Tech Quiz",
                "date": today + timedelta(days=7),
                "time_start": time(15, 0),
                "time_end": time(18, 0),
                "location": "Seminar Hall 1",
                "status": EventStatus.UPCOMING,
                "max_participants": 150,
            },
            {
                "title": "Vyto HackClash",
                "description": "A 36-Hours Hackathon where teams build innovative solutions from scratch. Mentors, workshops, and prizes worth ₹1,00,000. Push your limits and create something amazing.",
                "short_description": "36-Hours Hackathon",
                "category": "36-Hours Hackathon",
                "date": today + timedelta(days=30),
                "time_start": time(9, 0),
                "time_end": time(21, 0),
                "location": "Main Auditorium, Block A",
                "status": EventStatus.UPCOMING,
                "max_participants": 200,
            },
            {
                "title": "Code Review Friday",
                "description": "Weekly peer code review session. Bring your code, get feedback, and learn best practices from fellow developers.",
                "short_description": "Weekly peer code review session",
                "category": "Workshop",
                "date": today - timedelta(days=3),
                "time_start": time(16, 0),
                "time_end": time(18, 0),
                "location": "Room 205, CS Block",
                "status": EventStatus.COMPLETED,
            },
            {
                "title": "Cybersecurity CTF Challenge",
                "description": "Test your security skills in this capture-the-flag competition across cryptography, web exploitation, forensics, and reverse engineering.",
                "short_description": "CTF competition across security categories",
                "category": "Competition",
                "date": today - timedelta(days=10),
                "time_start": time(10, 0),
                "time_end": time(22, 0),
                "location": "Computer Lab 4",
                "status": EventStatus.COMPLETED,
            },
        ]

        for e in events_data:
            event = Event(**e)
            db.add(event)

        # Create library resources
        resources_data = [
            {
                "title": "Introduction to Data Structures",
                "description": "Comprehensive notes covering arrays, linked lists, trees, graphs, and algorithms. Includes practice problems and complexity analysis.",
                "category": "Data Structures",
                "resource_type": ResourceType.PDF,
                "author": "Prof. Kumar",
                "external_url": "https://example.com/ds-notes",
            },
            {
                "title": "Machine Learning Crash Course",
                "description": "Google's fast-paced, practical introduction to ML. Covers classification, regression, neural networks, and more.",
                "category": "Machine Learning",
                "resource_type": ResourceType.LINK,
                "author": "Google AI",
                "external_url": "https://developers.google.com/machine-learning/crash-course",
            },
            {
                "title": "React Best Practices 2025",
                "description": "A guide to modern React development including hooks, server components, performance optimization, and testing strategies.",
                "category": "Web Development",
                "resource_type": ResourceType.TUTORIAL,
                "author": "VytoVerse Team",
            },
            {
                "title": "Cybersecurity Fundamentals",
                "description": "Essential concepts in information security including network security, encryption, authentication, and common attack vectors.",
                "category": "Cybersecurity",
                "resource_type": ResourceType.PDF,
                "author": "Sneha Reddy",
            },
            {
                "title": "Python for Competitive Programming",
                "description": "Python-specific techniques for competitive programming. Covers common patterns, STL equivalents, and optimization tricks.",
                "category": "Programming",
                "resource_type": ResourceType.NOTE,
                "author": "Aarav Sharma",
            },
            {
                "title": "Git & GitHub Workflow Guide",
                "description": "Complete guide to version control with Git and collaborative development using GitHub.",
                "category": "Tools",
                "resource_type": ResourceType.TUTORIAL,
                "author": "VytoVerse Team",
            },
        ]

        for r in resources_data:
            resource = LibraryResource(**r, uploaded_by=admin.id)
            db.add(resource)

        db.commit()
        print("✓ Database seeded successfully!")
        print(f"  Admin: admin@vytoverse.com / admin123")
        print(f"  Users: {len(users_data)} sample users created")
        print(f"  Events: {len(events_data)} sample events created")
        print(f"  Resources: {len(resources_data)} sample resources created")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
