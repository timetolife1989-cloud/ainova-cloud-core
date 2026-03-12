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

## Tennivaló
- ⬜ CSP (Content-Security-Policy) header hozzáadása
- ⬜ HSTS header (Strict-Transport-Security)
- ⬜ Superadmin backdoor kikapcsolás production-ben (`DISABLE_SUPERADMIN=true`)
- ⬜ Session ID-k HttpOnly + Secure + SameSite=Strict
- ⬜ Password policy konfigurálhatóság (min. hossz, komplexitás)
- ⬜ Dependency audit (`npm audit`)
