# BIZTONSÁGI FELADATOK

> Utolsó frissítés: 2026.03.15

## Kész
- ✅ CSRF double-submit cookie (24h TTL, constant-time compare)
- ✅ bcryptjs 12 rounds jelszó hash
- ✅ Session idle timeout (30 perc) + absolute expiry (24 óra)
- ✅ Rate limiting (5 hibás login / 15 perc)
- ✅ Audit log (login/logout/akciók IP címmel)
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS, Referrer-Policy)
- ✅ Parameterized queries (SQL injection védelem)
- ✅ Zod input validation (API-k)
- ✅ CSP (Content-Security-Policy) header — proxy.ts-ben (script-src, style-src, connect-src stb.)
- ✅ HSTS header (Strict-Transport-Security) — max-age=2y, includeSubDomains, preload
- ✅ Permissions-Policy header (camera, microphone, geolocation letiltva)
- ✅ Session ID cookie: HttpOnly + Secure + SameSite=Strict
- ✅ Kliens-oldali inaktivitás érzékelés (25p figyelmeztetés, 30p auto-kijelentkezés)
- ✅ Edge auth pre-check (proxy.ts — session validálás API route-okhoz)
- ✅ API Gateway rate limiting (100 req/perc, X-API-Key header)
- ✅ SQL injection fix az export API-kban (parameterized queries)

## Tennivaló
- ⬜ Superadmin backdoor kikapcsolás production-ben (`DISABLE_SUPERADMIN=true`)
- ⬜ Password policy konfigurálhatóság (min. hossz, komplexitás)
- ⬜ Dependency audit (`npm audit`) — rendszeres futtatás
