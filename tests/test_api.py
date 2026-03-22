"""
Integration tests for the Book Store API.

Tests cover PRD features:
  FR003  – Manual book creation
  FR004  – Stock update
  FR005  – Price update
  FR007  – Keyword / title / author search (buyer catalog)
  FR008  – Genre filter in buyer catalog
  FR009  – Book detail page (buyer-facing)
  FR012  – Tenant self-registration (auto-login)
  FR013  – Logo upload
  FR014  – Tenant data isolation
  FR015  – QR code generation
  FR017  – Password change (current password required)
  FR018  – Create staff user (tenant-admin only)
  FR019  – Delete staff user; cannot delete own account
  FR020  – Slug-free login; suspended tenant blocked
  FR021  – Catalog export CSV / JSON
  FR022  – Superuser lists all tenants
  FR023  – Superuser suspends tenant
  FR024  – Superuser reactivates tenant
  FR025  – Superuser resets admin password
  FR028  – Search-config get/update; reindex

Usage:
    pip install requests pytest
    pytest app/tests/test_api.py -v

Environment variables (all optional):
    BASE_URL          API base URL  (default: http://localhost:8081)
    SUPERUSER_EMAIL   (default: z@zed.com)
    SUPERUSER_PWD     (default: zed)
"""

import os
import time
import uuid

import pytest
import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = os.getenv("BASE_URL", "http://localhost:8081").rstrip("/")
SUPERUSER_EMAIL = os.getenv("SUPERUSER_EMAIL", "z@zed.com")
SUPERUSER_PWD = os.getenv("SUPERUSER_PWD", "zed")

API = BASE_URL  # nginx proxies /auth, /books, /tenant, /superuser/ directly at root


def api(path: str) -> str:
    """Build a full API URL."""
    return f"{API}{path}"


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def unique_email(prefix: str = "test") -> str:
    return f"{prefix}+{uuid.uuid4().hex[:8]}@integration.test"


def unique_store_name() -> str:
    return f"Test Store {uuid.uuid4().hex[:6]}"


def login(email: str, password: str) -> dict:
    """Login and return the full JSON response body."""
    r = requests.post(
        api("/auth/login"), json={"email": email, "password": password}, timeout=10
    )
    assert r.status_code == 200, f"Login failed ({r.status_code}): {r.text}"
    return r.json()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def superuser_token() -> str:
    """Return a valid superuser JWT token (session-scoped)."""
    data = login(SUPERUSER_EMAIL, SUPERUSER_PWD)
    assert data.get("role") == "superuser", "Expected superuser role"
    return data["token"]


@pytest.fixture(scope="session")
def tenant_a() -> dict:
    """Register Tenant A and return {token, tenant_id, slug, admin_email, admin_password}."""
    email = unique_email("admin_a")
    password = "Pass1234!"
    store = unique_store_name()

    r = requests.post(
        api("/auth/register"),
        json={
            "store_name": store,
            "admin_name": "Admin A",
            "email": email,
            "password": password,
        },
        timeout=10,
    )
    assert r.status_code == 201, f"Registration failed: {r.text}"

    data = r.json()
    assert data.get("role") == "tenant-admin"
    return {
        "token": data["token"],
        "tenant_id": data["tenant"]["id"],
        "slug": data["tenant"]["slug"],
        "admin_email": email,
        "admin_password": password,
        "store_name": data["tenant"]["store_name"],
    }


@pytest.fixture(scope="session")
def tenant_b() -> dict:
    """Register Tenant B (for isolation tests)."""
    email = unique_email("admin_b")
    password = "Pass5678!"
    store = unique_store_name()

    r = requests.post(
        api("/auth/register"),
        json={
            "store_name": store,
            "admin_name": "Admin B",
            "email": email,
            "password": password,
        },
        timeout=10,
    )
    assert r.status_code == 201, f"Registration Tenant B failed: {r.text}"

    data = r.json()
    return {
        "token": data["token"],
        "tenant_id": data["tenant"]["id"],
        "slug": data["tenant"]["slug"],
        "admin_email": email,
        "admin_password": password,
    }


@pytest.fixture(scope="session")
def book_a(tenant_a) -> dict:
    """Create a book in Tenant A's catalog. Returns the book dict."""
    r = requests.post(
        api("/books"),
        json={
            "title": "Integration Test Book",
            "author": "Test Author",
            "isbn": "9780000000001",
            "publisher": "Test Publisher",
            "publish_year": 2024,
            "genre": "Science Fiction",
            "description": "A book used in integration tests",
            "price": 19.99,
            "stock": 10,
            "language": "English",
            "keywords": ["integration", "testing", "scifi"],
        },
        headers=auth_headers(tenant_a["token"]),
        timeout=10,
    )
    assert r.status_code == 201, f"Create book failed: {r.text}"
    book = r.json()["data"]
    # Give Elasticsearch time to index the new document before search tests run
    time.sleep(2)
    return book


# ---------------------------------------------------------------------------
# FR012 – Tenant self-registration
# ---------------------------------------------------------------------------


class TestRegistration:
    def test_register_creates_tenant_and_admin(self):
        """FR012: Submitting registration form creates isolated tenant + auto-login token."""
        email = unique_email("reg")
        r = requests.post(
            api("/auth/register"),
            json={
                "store_name": "FR012 Test Store",
                "admin_name": "Reg Tester",
                "email": email,
                "password": "Secure1234!",
            },
            timeout=10,
        )
        assert r.status_code == 201
        data = r.json()
        assert "token" in data
        assert data["role"] == "tenant-admin"
        assert data["tenant"]["store_name"] == "FR012 Test Store"
        assert data["user"]["email"] == email

    def test_register_duplicate_email_returns_409(self, tenant_a):
        """FR020: Email addresses are globally unique."""
        r = requests.post(
            api("/auth/register"),
            json={
                "store_name": "Another Store",
                "admin_name": "Duplicate",
                "email": tenant_a["admin_email"],  # already registered
                "password": "Secure1234!",
            },
            timeout=10,
        )
        assert r.status_code == 409

    def test_register_short_password_rejected(self):
        r = requests.post(
            api("/auth/register"),
            json={
                "store_name": "Short Pwd Store",
                "admin_name": "X",
                "email": unique_email("short"),
                "password": "abc",  # too short
            },
            timeout=10,
        )
        assert r.status_code == 400

    def test_register_missing_store_name_rejected(self):
        r = requests.post(
            api("/auth/register"),
            json={
                "admin_name": "X",
                "email": unique_email("nostore"),
                "password": "Secure1234!",
            },
            timeout=10,
        )
        assert r.status_code == 400


# ---------------------------------------------------------------------------
# FR020 – Slug-free login
# ---------------------------------------------------------------------------


class TestLogin:
    def test_login_with_valid_credentials(self, tenant_a):
        """FR020: Users log in with email + password; backend auto-detects tenant and role."""
        data = login(tenant_a["admin_email"], tenant_a["admin_password"])
        assert data["role"] == "tenant-admin"
        assert data["tenant"]["id"] == tenant_a["tenant_id"]
        assert "token" in data

    def test_login_wrong_password_returns_401(self, tenant_a):
        r = requests.post(
            api("/auth/login"),
            json={
                "email": tenant_a["admin_email"],
                "password": "wrongpassword",
            },
            timeout=10,
        )
        assert r.status_code == 401

    def test_login_unknown_email_returns_401(self):
        r = requests.post(
            api("/auth/login"),
            json={
                "email": "nobody@nowhere.invalid",
                "password": "anything",
            },
            timeout=10,
        )
        assert r.status_code == 401

    def test_superuser_login_returns_superuser_role(self):
        data = login(SUPERUSER_EMAIL, SUPERUSER_PWD)
        assert data["role"] == "superuser"
        assert data.get("tenant") is None


# ---------------------------------------------------------------------------
# FR003 – Manual book creation
# ---------------------------------------------------------------------------


class TestBookCreation:
    def test_create_book_manual(self, tenant_a):
        """FR003: A form allows manual entry of all metadata fields; record saved on submit."""
        r = requests.post(
            api("/books"),
            json={
                "title": "Manual Entry Book",
                "author": "Jane Doe",
                "isbn": "9780000000099",
                "publisher": "Acme Books",
                "publish_year": 2023,
                "genre": "History",
                "description": "A manually entered book",
                "price": 14.99,
                "stock": 5,
                "language": "English",
                "keywords": ["history", "manual"],
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 201
        book = r.json()["data"]
        assert book["title"] == "Manual Entry Book"
        assert book["author"] == "Jane Doe"
        assert float(book["price"]) == 14.99
        assert book["stock"] == 5

    def test_create_book_requires_auth(self):
        """Unauthenticated book creation must be rejected."""
        r = requests.post(
            api("/books"),
            json={
                "title": "Unauthorized Book",
                "author": "Ghost",
                "price": 9.99,
                "stock": 1,
            },
            timeout=10,
        )
        assert r.status_code == 401

    def test_create_book_missing_required_field(self, tenant_a):
        """Backend validates required fields (title and author at minimum)."""
        r = requests.post(
            api("/books"),
            json={
                "author": "No Title Author",
                "price": 9.99,
                "stock": 1,
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 400


# ---------------------------------------------------------------------------
# FR004 / FR005 – Stock and price updates
# ---------------------------------------------------------------------------


class TestBookUpdates:
    def test_update_stock(self, tenant_a, book_a):
        """FR004: Stock count change is saved and reflected in catalog."""
        new_stock = book_a["stock"] + 5
        r = requests.put(
            api(f"/books/{book_a['id']}"),
            json={
                **book_a,
                "stock": new_stock,
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 200

        # Verify change persisted
        r2 = requests.get(
            api(f"/books/{book_a['id']}"),
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r2.status_code == 200
        assert r2.json()["data"]["stock"] == new_stock

    def test_update_price(self, tenant_a, book_a):
        """FR005: Price change is saved and immediately reflected."""
        new_price = 29.99
        r = requests.put(
            api(f"/books/{book_a['id']}"),
            json={
                **book_a,
                "price": new_price,
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 200

        r2 = requests.get(
            api(f"/books/{book_a['id']}"),
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r2.status_code == 200
        assert float(r2.json()["data"]["price"]) == new_price

    def test_update_book_not_found(self, tenant_a):
        fake_id = str(uuid.uuid4())
        r = requests.put(
            api(f"/books/{fake_id}"),
            json={
                "title": "Ghost",
                "author": "Ghost",
                "price": 1.0,
                "stock": 0,
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# FR009 / FR007 – Buyer catalog: list, detail, search
# ---------------------------------------------------------------------------


class TestBuyerCatalog:
    def test_list_public_catalog(self, tenant_a, book_a):
        """FR009: Buyer catalog renders all stored fields."""
        slug = tenant_a["slug"]
        r = requests.get(api(f"/tenant/{slug}/books"), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        ids = [b["id"] for b in data["data"]]
        assert book_a["id"] in ids

    def test_public_book_detail(self, tenant_a, book_a):
        """FR009: Book detail page returns all stored fields; price and stock visible."""
        slug = tenant_a["slug"]
        r = requests.get(api(f"/tenant/{slug}/books/{book_a['id']}"), timeout=10)
        assert r.status_code == 200
        b = r.json()["data"]
        assert b["id"] == book_a["id"]
        assert b["title"] == book_a["title"]
        assert "price" in b
        assert "stock" in b

    def test_public_search_by_title(self, tenant_a, book_a):
        """FR007: Search by keyword returns relevant results."""
        slug = tenant_a["slug"]
        r = requests.get(
            api(f"/tenant/{slug}/books"),
            params={"q": "Integration Test Book"},
            timeout=10,
        )
        assert r.status_code == 200
        data = r.json()
        ids = [b["id"] for b in data["data"]]
        assert book_a["id"] in ids

    def test_public_search_by_author(self, tenant_a, book_a):
        """FR007: Search by author returns relevant results."""
        slug = tenant_a["slug"]
        r = requests.get(
            api(f"/tenant/{slug}/books"), params={"q": "Test Author"}, timeout=10
        )
        assert r.status_code == 200
        assert any(b["id"] == book_a["id"] for b in r.json()["data"])

    def test_public_search_no_results_returns_empty(self, tenant_a):
        """FR007: No results shows empty data array (not an error)."""
        slug = tenant_a["slug"]
        r = requests.get(
            api(f"/tenant/{slug}/books"), params={"q": "zzznomatchxyz"}, timeout=10
        )
        assert r.status_code == 200
        assert r.json()["count"] == 0
        assert r.json()["data"] == []

    def test_public_detail_nonexistent_book(self, tenant_a):
        slug = tenant_a["slug"]
        r = requests.get(api(f"/tenant/{slug}/books/{uuid.uuid4()}"), timeout=10)
        assert r.status_code == 404

    def test_public_catalog_unknown_slug(self):
        r = requests.get(api("/tenant/no-such-store-xyz/books"), timeout=10)
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# FR008 – Genre filter (buyer catalog)
# ---------------------------------------------------------------------------


class TestGenreFilter:
    def test_genre_filter_via_search(self, tenant_a, book_a):
        """FR008: Searching by genre keyword returns matching books."""
        slug = tenant_a["slug"]
        r = requests.get(
            api(f"/tenant/{slug}/books"), params={"q": book_a["genre"]}, timeout=10
        )
        assert r.status_code == 200
        # At least our book should appear
        assert any(b["id"] == book_a["id"] for b in r.json()["data"])


# ---------------------------------------------------------------------------
# FR013 – Logo upload
# ---------------------------------------------------------------------------


class TestLogoUpload:
    def test_upload_logo(self, tenant_a):
        """FR013: Uploading a logo updates branding; must return 200."""
        # Create a minimal 1×1 PNG in memory
        import struct, zlib

        def make_tiny_png() -> bytes:
            header = b"\x89PNG\r\n\x1a\n"

            def chunk(name, data):
                c = struct.pack(">I", len(data)) + name + data
                return c + struct.pack(">I", zlib.crc32(name + data) & 0xFFFFFFFF)

            ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
            raw = b"\x00\xff\xff\xff"
            idat = chunk(b"IDAT", zlib.compress(raw))
            iend = chunk(b"IEND", b"")
            return header + ihdr + idat + iend

        png_bytes = make_tiny_png()
        r = requests.post(
            api("/tenant/logo"),
            files={"logo": ("logo.png", png_bytes, "image/png")},
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 200
        assert "tenant" in r.json()

    def test_upload_logo_requires_auth(self):
        r = requests.post(
            api("/tenant/logo"),
            files={"logo": ("x.png", b"data", "image/png")},
            timeout=10,
        )
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# FR015 – QR code generation
# ---------------------------------------------------------------------------


class TestQRCode:
    def test_qr_code_returns_catalog_url(self, tenant_a):
        """FR015: QR code endpoint returns a catalog URL for the store."""
        r = requests.get(
            api("/tenant/qrcode"), headers=auth_headers(tenant_a["token"]), timeout=10
        )
        assert r.status_code == 200
        data = r.json()
        assert "catalog_url" in data
        assert tenant_a["slug"] in data["catalog_url"]

    def test_qr_code_requires_auth(self):
        r = requests.get(api("/tenant/qrcode"), timeout=10)
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# FR017 – Password change (current password required)
# ---------------------------------------------------------------------------


class TestPasswordChange:
    def test_change_password_requires_current_password(self, tenant_a):
        """FR017: Password change requires current password verification."""
        r = requests.put(
            api("/auth/profile"),
            json={
                "new_password": "NewPass9999!",
                # missing current_password
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 400

    def test_change_password_wrong_current_password(self, tenant_a):
        r = requests.put(
            api("/auth/profile"),
            json={
                "current_password": "totally_wrong",
                "new_password": "NewPass9999!",
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 401

    def test_change_password_success_and_new_password_works(self):
        """FR017: Successful password change; new password allows login."""
        email = unique_email("pwdchange")
        old_pwd = "OldPass1234!"
        new_pwd = "NewPass5678!"

        # Register a fresh user so we don't disturb tenant_a's password
        r = requests.post(
            api("/auth/register"),
            json={
                "store_name": "Pwd Change Store",
                "admin_name": "PwdTester",
                "email": email,
                "password": old_pwd,
            },
            timeout=10,
        )
        assert r.status_code == 201
        token = r.json()["token"]

        # Change the password
        r2 = requests.put(
            api("/auth/profile"),
            json={
                "current_password": old_pwd,
                "new_password": new_pwd,
            },
            headers=auth_headers(token),
            timeout=10,
        )
        assert r2.status_code == 200

        # Old password should no longer work
        r3 = requests.post(
            api("/auth/login"), json={"email": email, "password": old_pwd}, timeout=10
        )
        assert r3.status_code == 401

        # New password must work
        r4 = requests.post(
            api("/auth/login"), json={"email": email, "password": new_pwd}, timeout=10
        )
        assert r4.status_code == 200

    def test_change_password_too_short_rejected(self, tenant_a):
        r = requests.put(
            api("/auth/profile"),
            json={
                "current_password": tenant_a["admin_password"],
                "new_password": "short",
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 400


# ---------------------------------------------------------------------------
# FR018 / FR019 – User management
# ---------------------------------------------------------------------------


class TestUserManagement:
    def test_create_staff_user(self, tenant_a):
        """FR018: tenant-admin can create 'user' accounts for store staff."""
        email = unique_email("staff")
        r = requests.post(
            api("/auth/users"),
            json={
                "name": "Staff Member",
                "email": email,
                "password": "Staff1234!",
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 201
        created = r.json()["user"]
        assert created["role"] == "user"
        assert created["email"] == email

    def test_created_user_can_login(self, tenant_a):
        """FR018: Created user can log in (slug-free)."""
        email = unique_email("stafflogin")
        requests.post(
            api("/auth/users"),
            json={
                "name": "Login Tester",
                "email": email,
                "password": "Staff1234!",
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )

        data = login(email, "Staff1234!")
        assert data["role"] == "user"
        assert data["tenant"]["id"] == tenant_a["tenant_id"]

    def test_create_user_requires_tenant_admin(self, tenant_a):
        """FR018: Only tenant-admin can create users."""
        email = unique_email("staffforuser")
        requests.post(
            api("/auth/users"),
            json={
                "name": "Staff For User",
                "email": email,
                "password": "Staff1234!",
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )

        user_data = login(email, "Staff1234!")
        user_token = user_data["token"]

        r = requests.post(
            api("/auth/users"),
            json={
                "name": "Unauthorized Staff",
                "email": unique_email("unauth"),
                "password": "Staff1234!",
            },
            headers=auth_headers(user_token),
            timeout=10,
        )
        assert r.status_code == 403

    def test_delete_staff_user(self, tenant_a):
        """FR019: Deleted user is immediately unable to log in."""
        email = unique_email("todelete")
        pwd = "ToDelete1234!"

        # Create user
        r = requests.post(
            api("/auth/users"),
            json={
                "name": "To Delete",
                "email": email,
                "password": pwd,
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 201
        user_id = r.json()["user"]["id"]

        # Delete user
        r2 = requests.delete(
            api(f"/auth/users/{user_id}"),
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r2.status_code == 200

        # Login should now fail
        r3 = requests.post(
            api("/auth/login"), json={"email": email, "password": pwd}, timeout=10
        )
        assert r3.status_code == 401

    def test_admin_cannot_delete_own_account(self, tenant_a):
        """FR019: Admin cannot delete their own account."""
        # Get the current user's ID via /auth/me
        r = requests.get(
            api("/auth/me"), headers=auth_headers(tenant_a["token"]), timeout=10
        )
        assert r.status_code == 200
        admin_id = r.json()["user"]["id"]

        r2 = requests.delete(
            api(f"/auth/users/{admin_id}"),
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r2.status_code == 400

    def test_list_users_returns_tenant_users(self, tenant_a):
        """FR018: List users endpoint returns only this tenant's users."""
        r = requests.get(
            api("/auth/users"), headers=auth_headers(tenant_a["token"]), timeout=10
        )
        assert r.status_code == 200
        users = r.json()["data"]
        assert isinstance(users, list)
        # All returned users must belong to tenant_a (email domain check via login would confirm,
        # but the API returns no tenant_id; just verify the structure)
        for u in users:
            assert "id" in u
            assert "email" in u
            assert "role" in u


# ---------------------------------------------------------------------------
# FR014 – Tenant isolation
# ---------------------------------------------------------------------------


class TestTenantIsolation:
    def test_book_from_tenant_a_not_visible_in_tenant_b_catalog(
        self, tenant_a, tenant_b, book_a
    ):
        """FR014: Books created under Tenant A are never visible to Tenant B."""
        slug_b = tenant_b["slug"]
        r = requests.get(api(f"/tenant/{slug_b}/books"), timeout=10)
        assert r.status_code == 200
        ids = [b["id"] for b in r.json()["data"]]
        assert book_a["id"] not in ids

    def test_tenant_b_cannot_read_tenant_a_book_via_admin_api(self, tenant_b, book_a):
        """FR014: Tenant B's admin cannot access Tenant A's book via /books/:id."""
        r = requests.get(
            api(f"/books/{book_a['id']}"),
            headers=auth_headers(tenant_b["token"]),
            timeout=10,
        )
        assert r.status_code == 404

    def test_tenant_b_cannot_delete_tenant_a_book(self, tenant_b, book_a):
        r = requests.delete(
            api(f"/books/{book_a['id']}"),
            headers=auth_headers(tenant_b["token"]),
            timeout=10,
        )
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# FR021 – Catalog export
# ---------------------------------------------------------------------------


class TestCatalogExport:
    def test_export_csv(self, tenant_a, book_a):
        """FR021: Export as CSV; only tenant-admin can trigger; all fields included."""
        r = requests.get(
            api("/tenant/export"),
            params={"format": "csv"},
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("Content-Type", "")
        lines = r.text.splitlines()
        assert len(lines) >= 2  # header + at least one book row
        # Header must contain expected columns
        header = lines[0]
        assert "title" in header
        assert "author" in header
        assert "price" in header

    def test_export_json(self, tenant_a, book_a):
        """FR021: Export as JSON; returns array of books with all fields."""
        r = requests.get(
            api("/tenant/export"),
            params={"format": "json"},
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 200
        assert "application/json" in r.headers.get("Content-Type", "")
        books = r.json()
        assert isinstance(books, list)
        assert len(books) >= 1
        assert any(b["id"] == book_a["id"] for b in books)

    def test_export_requires_tenant_admin(self, tenant_a):
        """FR021: Only tenant-admin can export; 'user' role is rejected with 403."""
        email = unique_email("exportuser")
        pwd = "ExportUser1234!"
        requests.post(
            api("/auth/users"),
            json={
                "name": "Export User",
                "email": email,
                "password": pwd,
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )

        user_token = login(email, pwd)["token"]

        r = requests.get(
            api("/tenant/export"),
            params={"format": "csv"},
            headers=auth_headers(user_token),
            timeout=10,
        )
        assert r.status_code == 403

    def test_export_invalid_format_rejected(self, tenant_a):
        r = requests.get(
            api("/tenant/export"),
            params={"format": "xml"},
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 400


# ---------------------------------------------------------------------------
# FR022–FR025 – Superuser dashboard
# ---------------------------------------------------------------------------


class TestSuperuserDashboard:
    def test_list_tenants(self, superuser_token, tenant_a, tenant_b):
        """FR022: Superuser can list all registered tenants with their admin users."""
        r = requests.get(
            api("/superuser/tenants"), headers=auth_headers(superuser_token), timeout=10
        )
        assert r.status_code == 200
        tenants = r.json()["data"]
        ids = [t["id"] for t in tenants]
        assert tenant_a["tenant_id"] in ids
        assert tenant_b["tenant_id"] in ids

    def test_list_tenants_includes_admins(self, superuser_token, tenant_a):
        """FR022: Each tenant entry includes its admin user list."""
        r = requests.get(
            api("/superuser/tenants"), headers=auth_headers(superuser_token), timeout=10
        )
        tenants = r.json()["data"]
        ta = next(t for t in tenants if t["id"] == tenant_a["tenant_id"])
        assert isinstance(ta["admins"], list)
        assert len(ta["admins"]) >= 1
        assert any(a["email"] == tenant_a["admin_email"] for a in ta["admins"])

    def test_list_tenants_requires_superuser(self, tenant_a):
        """Non-superuser cannot access the superuser endpoint."""
        r = requests.get(
            api("/superuser/tenants"),
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 403

    def test_suspend_and_activate_tenant(self, superuser_token):
        """FR023/FR024: Superuser can suspend and reactivate a tenant."""
        # Register a throwaway tenant
        email = unique_email("suspend")
        r = requests.post(
            api("/auth/register"),
            json={
                "store_name": "Suspend Test Store",
                "admin_name": "Suspend Admin",
                "email": email,
                "password": "Suspend1234!",
            },
            timeout=10,
        )
        assert r.status_code == 201
        tenant_id = r.json()["tenant"]["id"]

        # Suspend
        r2 = requests.put(
            api(f"/superuser/tenants/{tenant_id}/suspend"),
            headers=auth_headers(superuser_token),
            timeout=10,
        )
        assert r2.status_code == 200

        # Suspended tenant's admin login must be rejected with 403
        r3 = requests.post(
            api("/auth/login"),
            json={"email": email, "password": "Suspend1234!"},
            timeout=10,
        )
        assert r3.status_code == 403
        assert "suspended" in r3.json()["msg"].lower()

        # Reactivate
        r4 = requests.put(
            api(f"/superuser/tenants/{tenant_id}/activate"),
            headers=auth_headers(superuser_token),
            timeout=10,
        )
        assert r4.status_code == 200

        # Login should work again
        r5 = requests.post(
            api("/auth/login"),
            json={"email": email, "password": "Suspend1234!"},
            timeout=10,
        )
        assert r5.status_code == 200

    def test_reset_admin_password(self, superuser_token, tenant_a):
        """FR025: Superuser can reset admin password without knowing the current one."""
        # Get the admin's user ID from the superuser endpoint
        r = requests.get(
            api("/superuser/tenants"), headers=auth_headers(superuser_token), timeout=10
        )
        tenants = r.json()["data"]
        ta = next(t for t in tenants if t["id"] == tenant_a["tenant_id"])
        admin = next(a for a in ta["admins"] if a["email"] == tenant_a["admin_email"])
        admin_id = admin["id"]

        new_pwd = "SuperReset9876!"
        r2 = requests.put(
            api(
                f"/superuser/tenants/{tenant_a['tenant_id']}/admins/{admin_id}/password"
            ),
            json={"new_password": new_pwd},
            headers=auth_headers(superuser_token),
            timeout=10,
        )
        assert r2.status_code == 200

        # Restore original password so other tests still work
        new_token = login(tenant_a["admin_email"], new_pwd)["token"]
        requests.put(
            api("/auth/profile"),
            json={
                "current_password": new_pwd,
                "new_password": tenant_a["admin_password"],
            },
            headers=auth_headers(new_token),
            timeout=10,
        )

    def test_reset_password_too_short_rejected(self, superuser_token, tenant_a):
        """FR025: New password must be at least 8 characters."""
        r = requests.get(
            api("/superuser/tenants"), headers=auth_headers(superuser_token), timeout=10
        )
        tenants = r.json()["data"]
        ta = next(t for t in tenants if t["id"] == tenant_a["tenant_id"])
        admin_id = ta["admins"][0]["id"]

        r2 = requests.put(
            api(
                f"/superuser/tenants/{tenant_a['tenant_id']}/admins/{admin_id}/password"
            ),
            json={"new_password": "short"},
            headers=auth_headers(superuser_token),
            timeout=10,
        )
        assert r2.status_code == 400


# ---------------------------------------------------------------------------
# FR028 – Search index configuration
# ---------------------------------------------------------------------------


class TestSearchConfig:
    def test_get_search_config_defaults(self, tenant_a):
        """FR028: Search config lists all indexable fields; defaults are all-enabled."""
        r = requests.get(
            api("/tenant/search-config"),
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 200
        cfg = r.json()["data"]
        # All index fields should default to True
        for field in [
            "idx_title",
            "idx_author",
            "idx_isbn",
            "idx_publisher",
            "idx_genre",
            "idx_description",
            "idx_keywords",
        ]:
            assert cfg.get(field) is True, f"{field} should default to True"

    def test_update_search_config(self, tenant_a):
        """FR028: Admin can update index config; changes persist."""
        r = requests.put(
            api("/tenant/search-config"),
            json={
                "idx_description": False,
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 200
        updated = r.json()["data"]
        assert updated["idx_description"] is False
        assert updated["idx_title"] is True  # unchanged fields stay True

        # Restore
        requests.put(
            api("/tenant/search-config"),
            json={
                "idx_description": True,
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )

    def test_search_config_invalid_field_type_rejected(self, tenant_a):
        """FR028: Non-boolean values for config fields are rejected."""
        r = requests.put(
            api("/tenant/search-config"),
            json={
                "idx_title": "yes",  # must be boolean
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 400

    def test_search_config_requires_tenant_admin(self, tenant_a):
        """FR028: Only tenant-admin can access or modify search config."""
        email = unique_email("cfguser")
        pwd = "CfgUser1234!"
        requests.post(
            api("/auth/users"),
            json={
                "name": "Config User",
                "email": email,
                "password": pwd,
            },
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )

        user_token = login(email, pwd)["token"]

        r = requests.get(
            api("/tenant/search-config"), headers=auth_headers(user_token), timeout=10
        )
        assert r.status_code == 403

    def test_trigger_reindex(self, tenant_a):
        """FR028: Reindex endpoint returns indexed_count and total_books."""
        r = requests.post(
            api("/tenant/search-reindex"),
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 200
        data = r.json()
        assert "indexed_count" in data
        assert "total_books" in data
        assert data["total_books"] >= 1


# ---------------------------------------------------------------------------
# Miscellaneous / edge-case guards
# ---------------------------------------------------------------------------


class TestEdgeCases:
    def test_invalid_uuid_book_id_returns_400(self, tenant_a):
        r = requests.get(
            api("/books/not-a-uuid"),
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 400

    def test_unauthenticated_book_list_returns_401(self):
        r = requests.get(api("/books"), timeout=10)
        assert r.status_code == 401

    def test_public_store_info_by_slug(self, tenant_a):
        slug = tenant_a["slug"]
        r = requests.get(api(f"/tenant/{slug}/info"), timeout=10)
        assert r.status_code == 200
        info = r.json()["data"]
        assert info["slug"] == slug
        assert "store_name" in info

    def test_update_store_settings(self, tenant_a):
        new_name = f"Updated Store {uuid.uuid4().hex[:4]}"
        r = requests.put(
            api("/tenant/settings"),
            json={"store_name": new_name},
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 200

    def test_update_store_settings_too_short(self, tenant_a):
        r = requests.put(
            api("/tenant/settings"),
            json={"store_name": "X"},
            headers=auth_headers(tenant_a["token"]),
            timeout=10,
        )
        assert r.status_code == 400
