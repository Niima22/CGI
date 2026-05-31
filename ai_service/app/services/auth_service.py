from __future__ import annotations

import hashlib
import hmac
import secrets

from psycopg.errors import UniqueViolation

from app.data.database import get_connection, init_db
from app.models.schemas import AccountRequest, AuthResponse, AuthUser, SignupRequest


class AuthError(RuntimeError):
    pass


class AccountExistsError(AuthError):
    pass


class AuthService:
    def signup(self, request: SignupRequest) -> AuthResponse:
        init_db()
        email = self._normalize_email(request.email)
        password_hash = self._hash_password(request.password)

        try:
            with get_connection() as connection:
                user = connection.execute(
                    """
                    INSERT INTO users (email, full_name, role, password_hash)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (email, request.full_name or "", request.role, password_hash),
                ).fetchone()
                user_id = int(user["id"])
                token = self._create_session(connection, user_id)
        except UniqueViolation as exc:
            raise AccountExistsError("An account already exists for this email.") from exc

        return AuthResponse(
            token=token,
            user=AuthUser(email=email, full_name=request.full_name or "", role=request.role),
        )

    def login(self, request: AccountRequest) -> AuthResponse:
        init_db()
        email = self._normalize_email(request.email)
        with get_connection() as connection:
            user = connection.execute(
                "SELECT id, email, full_name, role, password_hash FROM users WHERE email = %s",
                (email,),
            ).fetchone()

            if user is None or not self._verify_password(request.password, user["password_hash"]):
                raise AuthError("Email or password is incorrect.")

            token = self._create_session(connection, int(user["id"]))

        return AuthResponse(
            token=token,
            user=AuthUser(email=user["email"], full_name=user["full_name"], role=user["role"]),
        )

    def user_row_from_token(self, token: str) -> dict:
        init_db()
        with get_connection() as connection:
            user = connection.execute(
                """
                SELECT users.id, users.email, users.full_name, users.role
                FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token = %s
                """,
                (token,),
            ).fetchone()

        if user is None:
            raise AuthError("Session is invalid.")

        return dict(user)

    def user_from_token(self, token: str) -> AuthUser:
        user = self.user_row_from_token(token)
        return AuthUser(email=user["email"], full_name=user["full_name"], role=user["role"])

    def _create_session(self, connection, user_id: int) -> str:
        token = secrets.token_urlsafe(32)
        connection.execute(
            "INSERT INTO sessions (token, user_id) VALUES (%s, %s)",
            (token, user_id),
        )
        return token

    def _normalize_email(self, email: str) -> str:
        normalized = email.strip().lower()
        if not normalized.endswith("@cgi.com"):
            raise AuthError("Email must use the @cgi.com domain.")
        return normalized

    def _hash_password(self, password: str) -> str:
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
        return f"{salt}${digest.hex()}"

    def _verify_password(self, password: str, password_hash: str) -> bool:
        try:
            salt, expected = password_hash.split("$", 1)
        except ValueError:
            return False

        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
        return hmac.compare_digest(digest.hex(), expected)
