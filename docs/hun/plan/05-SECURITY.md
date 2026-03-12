# BIZTONSÁGI FELADATOK

## Kész
- ✅ CSRF double-submit cookie (24h TTL, constant-time compare)
- ✅ bcryptjs 12 rounds jelszó hash
- ✅ Session idle timeout (30 perc) + absolute expiry (24 óra)
- ✅ Rate limiting (5 hibás login / 15 perc)
- ✅ Audit log (login/logout/akciók IP címmel)
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS, Referrer-Policy)
- ✅ Parameterized queries (SQL injection védelem)
- ✅ Zod input validation (API-k)
- ✅ CSP (Content-Security-Policy) header — default-src 'self', connect-src supabase
- ✅ HSTS header (Strict-Transport-Security) — max-age=2y, includeSubDomains, preload
- ✅ Permissions-Policy header (camera, microphone, geolocation letiltva)
- ✅ Session ID cookie: HttpOnly + Secure + SameSite=Strict
- ✅ Kliens-oldali inaktivitás érzékelés (25p figyelmeztetés, 30p auto-kijelentkezés)

## Tennivaló
- ⬜ Superadmin backdoor kikapcsolás production-ben (`DISABLE_SUPERADMIN=true`)
- ⬜ Password policy konfigurálhatóság (min. hossz, komplexitás)
- ⬜ Dependency audit (`npm audit`)
