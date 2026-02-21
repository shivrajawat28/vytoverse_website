// =====================================
// GLOBAL HELPERS
// =====================================

function getToken() {
    return localStorage.getItem("token");
}

function setToken(token) {
    localStorage.setItem("token", token);
}

function removeToken() {
    localStorage.removeItem("token");
}

function toggleMenu() {
    const nav = document.getElementById("nav-links");
    if (nav) {
        nav.classList.toggle("show");
    }
}

function ensureFontAwesome() {
    const existingFa = document.querySelector('link[href*="font-awesome"]');
    if (existingFa) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";
    document.head.appendChild(link);
}

function ensureBottomNav() {
    const path = window.location.pathname;

    if (
        path.includes("login") ||
        path.includes("signup") ||
        path.includes("admin")
    ) {
        return;
    }

    if (document.querySelector(".bottom-nav")) return;

    const nav = document.createElement("div");
    nav.className = "bottom-nav";
    nav.innerHTML = `
        <a href="/"><i class="fas fa-home"></i></a>
        <a href="/team"><i class="fas fa-users"></i></a>
        <a href="/library"><i class="fas fa-book"></i></a>
        <a href="/tasks"><i class="fas fa-list-check"></i></a>
        <a href="/profile"><i class="fas fa-user"></i></a>
    `;
    document.body.appendChild(nav);
}

function normalizeTaskStatus(status) {
    return (status || "pending").toLowerCase().replaceAll(" ", "_");
}

function displayTaskStatus(status) {
    const normalized = normalizeTaskStatus(status);
    if (normalized === "not_completed") return "Not Completed";
    if (normalized === "completed") return "Completed";
    return "Pending";
}

function taskStatusClass(status) {
    const normalized = normalizeTaskStatus(status);
    if (normalized === "completed") return "task-status-completed";
    if (normalized === "not_completed")
        return "task-status-not-completed";
    return "task-status-pending";
}

function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function resolveImagePath(path, fallback = "/static/images/founder.jpg") {
    const value = (path || "").trim();
    if (!value) return fallback;
    if (
        value.startsWith("http") ||
        value.startsWith("/") ||
        value.startsWith("data:")
    )
        return value;
    return `/static/images/${value}`;
}

function formatRoleLabel(roleValue) {
    const role = (roleValue || "member")
        .toLowerCase()
        .replaceAll(" ", "_");

    if (role === "admin" || role === "president")
        return "President";
    if (role === "vice_president") return "Vice President";
    if (role === "past_president") return "Past President";
    if (role === "user" || role === "member") return "Member";

    return role
        .split("_")
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join(" ");
}

function parsePreviewImages(previewLinkValue) {
    const raw = (previewLinkValue || "").trim();
    if (!raw) return ["/static/images/founder.jpg"];

    const values = raw
        .split(/\s*,\s*|\n+/)
        .map((value) => value.trim())
        .filter(Boolean);

    if (!values.length)
        return ["/static/images/founder.jpg"];

    return values.map((value) =>
        resolveImagePath(value)
    );
}

// =====================================
// FLASH MESSAGE SYSTEM
// =====================================

function showFlash(message, type = "success") {
    const flash = document.createElement("div");
    flash.className = `flash ${type}`;
    flash.innerText = message;

    document.body.appendChild(flash);

    setTimeout(() => flash.classList.add("show"), 100);

    setTimeout(() => {
        flash.classList.remove("show");
        setTimeout(() => flash.remove(), 400);
    }, 3000);
}

// =====================================
// LOGOUT
// =====================================

function logout() {
    removeToken();
    showFlash("Logged out successfully", "success");
    setTimeout(() => (window.location.href = "/"), 1000);
}

// =====================================
// HEADER AUTH SWITCH
// =====================================

async function updateHeaderAuth() {
    const authBtn = document.getElementById("auth-btn");
    if (!authBtn) return;

    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch("/users/profile", {
            headers: {
                Authorization: "Bearer " + token,
            },
        });

        if (!res.ok) return;

        authBtn.innerText = "Profile";
        authBtn.href = "/profile";
    } catch (err) {
        console.log("Auth check failed");
    }
}

// =====================================
// SIGNUP
// =====================================

async function signupUser(event) {
    event.preventDefault();

    const data = {
        name: document.getElementById("name")?.value,
        email: document.getElementById("email")?.value,
        phone: document.getElementById("phone")?.value,
        password: document.getElementById("password")?.value,
    };

    const response = await fetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    let result;
    try {
        result = await response.json();
    } catch {
        showFlash("Server error", "error");
        return;
    }

    if (response.ok) {
        showFlash("Signup successful!", "success");
        setTimeout(
            () => (window.location.href = "/login"),
            1500
        );
    } else {
        showFlash(result.detail || "Signup failed", "error");
    }
}

// =====================================
// LOGIN
// =====================================

async function loginUser(event) {
    event.preventDefault();

    const email =
        document.getElementById("email")?.value;
    const password =
        document.getElementById("password")?.value;

    const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    let data;
    try {
        data = await response.json();
    } catch {
        showFlash("Server error", "error");
        return;
    }

    if (!response.ok) {
        showFlash(data.detail || "Login failed", "error");
        return;
    }

    setToken(data.access_token);
    showFlash("Login successful!", "success");

    const profileRes = await fetch("/users/profile", {
        headers: {
            Authorization:
                "Bearer " + data.access_token,
        },
    });

    const profileData = await profileRes.json();

    setTimeout(() => {
        if (
            ["admin", "president", "vice_president"].includes(
                profileData.role
            )
        ) {
            window.location.href = "/admin";
        } else {
            window.location.href = "/";
        }
    }, 1200);
}

// =====================================
// TEAM LOADER
// =====================================

async function loadTeam() {
    const presidentContainer =
        document.getElementById(
            "president-container"
        );
    if (!presidentContainer) return;

    try {
        const res = await fetch(
            "/users/team-data"
        );
        const data = await res.json();

        const viceContainer =
            document.getElementById(
                "vice-container"
            );
        const pastContainer =
            document.getElementById(
                "past-container"
            );
        const membersContainer =
            document.getElementById(
                "members-container"
            );

        presidentContainer.innerHTML = "";
        if (viceContainer)
            viceContainer.innerHTML = "";
        if (pastContainer)
            pastContainer.innerHTML = "";
        if (membersContainer)
            membersContainer.innerHTML = "";

        function createCard(user) {
            const contact =
                user.phone ||
                user.email ||
                "Not shared";

            return `
                <div class="team-card">
                    <img src="${resolveImagePath(
                user.profile_image
            )}">
                    <h3>${escapeHtml(
                user.name
            )}</h3>
                    <p>${escapeHtml(
                formatRoleLabel(
                    user.role
                )
            )}</p>
                    <p>${escapeHtml(
                contact
            )}</p>
                </div>
            `;
        }

        data.presidents?.forEach(
            (user) =>
            (presidentContainer.innerHTML +=
                createCard(user))
        );

        data.vice_presidents?.forEach(
            (user) =>
                viceContainer &&
                (viceContainer.innerHTML +=
                    createCard(user))
        );

        if (
            data.past_presidents?.length &&
            pastContainer
        ) {
            document.getElementById(
                "past-wrapper"
            ).style.display = "block";

            data.past_presidents.forEach(
                (user) =>
                (pastContainer.innerHTML +=
                    createCard(user))
            );
        }

        data.members?.forEach(
            (user) =>
                membersContainer &&
                (membersContainer.innerHTML +=
                    createCard(user))
        );
    } catch {
        console.log("Team load failed");
    }
}

// =====================================
// SEARCH
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        const searchInput =
            document.getElementById(
                "searchInput"
            );
        if (!searchInput) return;

        searchInput.addEventListener(
            "input",
            function () {
                const value =
                    this.value.toLowerCase();
                const cards =
                    document.querySelectorAll(
                        ".team-card"
                    );

                cards.forEach((card) => {
                    const heading =
                        card.querySelector(
                            "h3"
                        );
                    const name = heading
                        ? heading.innerText.toLowerCase()
                        : "";
                    card.style.display =
                        name.includes(value)
                            ? ""
                            : "none";
                });
            }
        );
    }
);

// =====================================
// SINGLE DOM READY BLOCK
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        updateHeaderAuth();
        ensureFontAwesome();
        ensureBottomNav();
        loadTeam();
    }
);