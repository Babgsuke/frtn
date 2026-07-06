# SCT API Server — Dokumentasi

## Overview

- **Stack:** Node.js Express, IP Whitelist auth, file-based storage
- **Listen:** `127.0.0.1:5000` (localhost, proxied via Nginx)
- **Auth:** IP Whitelist (`/etc/xray/api-whitelist.conf`) — otomatis membaca IP client
- **Total:** 44 endpoint (1 public, 43 protected)
- **Format response:** JSON

---

## Authentication

Menggunakan **IP Whitelist** — hanya IP yang terdaftar di `/etc/xray/api-whitelist.conf` yang bisa mengakses endpoint protected. Middleware membaca `X-Forwarded-For` header (jika ada) atau `req.ip` langsung.

**Format file whitelist:**
```
# SCT API Server — IP Whitelist
# Satu IP per baris. Baris diawali # akan diabaikan.
# Gunakan 0.0.0.0 untuk mengizinkan semua IP.

::1
203.0.113.1
```

### GET /api/auth/myip

Public. Cek IP sendiri yang terdeteksi oleh server.

**Success (200):**
```json
{ "ip": "203.0.113.1" }
```

---

### GET /api/auth/whitelist

Protected. Lihat daftar IP yang diizinkan.

**Success (200):**
```json
{
  "whitelist": ["::1", "203.0.113.1"],
  "file": "/etc/xray/api-whitelist.conf"
}
```

---

### POST /api/auth/whitelist

Protected. Tambah IP ke whitelist.

**Request:**
```json
{ "ip": "198.51.100.1" }
```

**Success (200):**
```json
{
  "message": "IP 198.51.100.1 ditambahkan ke whitelist",
  "whitelist": ["::1", "203.0.113.1", "198.51.100.1"]
}
```

**Error (400):**
```json
{ "error": "IP sudah ada di whitelist" }
```

---

### DELETE /api/auth/whitelist

Protected. Hapus IP dari whitelist.

**Request:**
```json
{ "ip": "198.51.100.1" }
```

**Success (200):**
```json
{
  "message": "IP 198.51.100.1 dihapus dari whitelist",
  "whitelist": ["::1", "203.0.113.1"]
}
```

**Error (404):**
```json
{ "error": "IP tidak ditemukan di whitelist" }
```

---

## Server

### GET /api/server/info

Protected. Informasi sistem VPS.

**Success (200):**
```json
{
  "ip": "203.0.113.1",
  "domain": "vps.example.com",
  "ram": "1999 MB",
  "cpu": "2.5%",
  "uptime": "10 days, 3 hours",
  "disk": {
    "total": "50G",
    "used": "25G",
    "usage": "50%"
  }
}
```

---

### GET /api/server/status

Protected. Status semua service.

**Success (200):**
```json
{
  "services": {
    "xray": "active", "nginx": "active", "haproxy": "active",
    "ssh": "active", "dropbear": "active", "api-server": "active",
    "ws": "active", "cron": "active"
  }
}
```

---

### GET /api/server/speedtest

Protected. Hasil speedtest via `speedtest-cli`.

**Success (200):**
```json
{ "result": "   Speedtest by Ookla\n\n     Server: Telkom - Jakarta (id: 1234)\n        ISP: PT Telkom Indonesia\n    Latency:    12.34 ms   (0.12 ms jitter)\n   Download:   85.67 Mbps (data used: 112.5 MB)\n     Upload:   42.18 Mbps (data used: 68.3 MB)\n" }
```

---

### POST /api/server/reboot

Protected. Reboot VPS.

**Success (200):**
```json
{ "message": "Server akan reboot dalam 2 detik" }
```

---

### POST /api/server/restart

Protected. Restart semua service (xray, nginx, haproxy, dropbear, ws, cron, dll).

**Success (200):**
```json
{ "message": "Semua service di-restart" }
```

---

### POST /api/server/domain

Protected. Ubah domain VPS.

**Request:**
```json
{ "domain": "new.example.com" }
```

**Success (200):**
```json
{ "message": "Domain diubah ke new.example.com" }
```

**Error (400):**
```json
{ "error": "Domain tidak valid" }
```

---

## SSH

### GET /api/ssh

Protected. List semua user SSH.

**Success (200):**
```json
{
  "users": [
    {
      "username": "user1",
      "exp": "2026-12-31",
      "status": "unlocked",
      "quota_gb": "10",
      "iplimit": "2"
    }
  ],
  "total": 1
}
```

---

### GET /api/ssh/active

Protected. List session SSH dan Dropbear yang aktif saat ini.

**Success (200):**
```json
{
  "active": [
    { "username": "user1", "ip": "192.168.1.100", "via": "ssh" },
    { "username": "user2", "ip": "10.0.0.5", "via": "dropbear" }
  ]
}
```

---

### POST /api/ssh

Protected. Buat user SSH baru.

**Request:**
```json
{
  "username": "user1",
  "password": "pass123",
  "quota": 10,
  "iplimit": 2,
  "days": 30
}
```

**Success (201):**
```json
{
  "message": "SSH user created",
  "data": { "username": "user1", "exp": "2026-08-02" },
  "text": "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n       Format SSH OVPN Account\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nUsername         : user1\nPassword         : pass123\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nIP               : 203.0.113.1\nHost             : vps.example.com\nPort OpenSSH     : 443, 80, 22\nPort Dropbear    : 109, 143\nPort SSH WS      : 80\nPort SSH SSL WS  : 443\nPort OVPN WS SSL : 443\nPort OVPN SSL    : 1194\nPort OVPN TCP    : 1194\nPort OVPN UDP    : 2200\nBadVPN UDP       : 7100, 7300, 7900\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nAktif Selama     : 30 Hari\nQuota            : 10 GB\nIP Limit         : 2\nDibuat Pada      : 03 Jul, 2026\nBerakhir Pada    : 02 Aug, 2026\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "base64": "4pyS4pyS4pyS4pyS4pyS4pyS..."
}
```

**Error (400):**
```json
{ "error": "Gagal: useradd: user user1 already exists" }
```

---

### POST /api/ssh/trial

Protected. Buat trial SSH (auto-generate username & password, auto-delete via `at`).

**Request (opsional — default 60 menit):**
```json
{ "minutes": 30 }
```

**Success (201):**
```json
{
  "message": "Trial SSH created",
  "data": { "username": "Trial-216Y", "exp": "2026-07-06" },
  "text": "════════════════════\n       Format SSH OVPN Account\n════════════════════\nUsername         : Trial-216Y\nPassword         : 0ZGWpr\n...\nAktif Selama     : 60 Menit\nQuota            : 0 GB\nIP Limit         : 99\nBerakhir Pada    : 06 Jul, 2026\n════════════════════",
  "html": "<b>...</b>",
  "base64": "4pWQ4pWQ..."
}
```

**Default trial:**
| Field | Value |
|---|---|
| Username | `Trial-` + 4 random `[X-Z0-9]` |
| Password | 6 random `[a-zA-Z0-9]` |
| Durasi | 60 menit (bisa diubah via `minutes`) |
| Quota | 0 GB (unlimited) |
| IP Limit | 99 |
| Auto-delete | `at` scheduler setelah `minutes` |

---

### GET /api/ssh/:username

Protected. Detail user SSH.

**Success (200):**
```json
{
  "username": "user1",
  "exp": "2026-08-02",
  "status": "unlocked",
  "password": "pass123",
  "quota_gb": "10",
  "iplimit": "2"
}
```

**Error (404):**
```json
{ "error": "User tidak ditemukan" }
```

---

### DELETE /api/ssh/:username

Protected. Hapus user SSH.

**Success (200):**
```json
{ "message": "User user1 dihapus" }
```

**Error (404):**
```json
{ "error": "User user1 tidak ditemukan" }
```

---

### PUT /api/ssh/:username/renew

Protected. Perpanjang masa aktif user SSH.

**Request:**
```json
{ "days": 30 }
```

**Success (200):**
```json
{ "message": "Diperpanjang hingga 2026-09-01", "exp": "2026-09-01" }
```

**Error (404):**
```json
{ "error": "User user1 tidak ditemukan" }
```

---

### PUT /api/ssh/:username/lock

Protected. Lock user SSH (passwd -l).

**Success (200):**
```json
{ "message": "User user1 di-lock" }
```

**Error (400):**
```json
{ "error": "Gagal lock: passwd: Permission denied" }
```

---

### PUT /api/ssh/:username/unlock

Protected. Unlock user SSH (passwd -u).

**Success (200):**
```json
{ "message": "User user1 di-unlock" }
```

**Error (400):**
```json
{ "error": "Gagal unlock: passwd: Permission denied" }
```

---

## Xray — VMess

### GET /api/vmess

Protected. List user VMess.

**Success (200):**
```json
{
  "users": [
    {
      "username": "vmess1",
      "exp": "2026-08-02",
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "quota_gb": "10",
      "iplimit": "2"
    }
  ],
  "total": 1
}
```

---

### POST /api/vmess

Protected. Buat user VMess baru.

**Request:**
```json
{
  "username": "vmess1",
  "quota": 10,
  "iplimit": 2,
  "days": 30
}
```

**Success (201):**
```json
{
  "message": "VMess created",
  "data": {
    "username": "vmess1",
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "exp": "2026-08-02",
    "quota_gb": "10",
    "iplimit": "2"
  },
  "text": "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n      VMESS XRAY\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRemarks       : vmess1\nDomain        : vps.example.com\nQuota         : 10 GB\nIP Limit      : 2\nPort TLS      : 400,8443\nport WS       : 80,8880,8080,2082\nUUID          : 550e8400-e29b-41d4-a716-446655440000\nLocation      : Jakarta\nISP           : PT Telkom Indonesia\nNetwork       : ws & grpc\nPath          : /vmess\nServiceName   : vmess-grpc\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nLink TLS      : vmess://eyJ2IjoiMiIsInBz...\nLink WS       : vmess://eyJ2IjoiMiIsInBz...\nLink GRPC     : vmess://eyJ2IjoiMiIsInBz...\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nAktif Selama   : 30 Hari\nDibuat Pada    : 03 Jul, 2026\nBerakhir Pada  : 02 Aug, 2026\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "base64": "4pyS4pyS4pyS..."
}
```

**Error (400):**
```json
{ "error": "Username vmess1 sudah ada" }
```

---

### POST /api/vmess/trial

Protected. Buat trial VMess (auto-generate username, default quota & iplimit).

**Request (opsional — default 60 menit):**
```json
{ "minutes": 30 }
```

**Success (201):**
```json
{
  "message": "Trial VMess created",
  "data": {
    "username": "Triall421",
    "uuid": "f8ed14a0-8f91-46c8-9b11-7a52e3270eac",
    "exp": "2026-07-06",
    "quota_gb": "1",
    "iplimit": "10"
  },
  "text": "════════════════════\n      VMESS XRAY\n════════════════════\n...\nAktif Selama   : 30 Menit\nBerakhir Pada  : 06 Jul, 2026\n════════════════════",
  "html": "<b>...</b>",
  "base64": "4pWQ4pWQ..."
}
```

**Default trial (semua Xray protocol):**
| Field | Value |
|---|---|
| Username | auto-generate per prefix protokol (lihat tabel bawah) |
| Durasi | 60 menit (bisa diubah via `minutes`) |
| Quota | 1 GB (shadowsocks: 5 GB) |
| IP Limit | 10 |

| Protocol | Prefix | Contoh |
|---|---|---|
| VMess | `Triall` + 3 digit | `Triall421` |
| VLESS | `Trial-VL` + 3 digit | `Trial-VL141` |
| Trojan | `TrI4L` + 3 digit | `TrI4L578` |
| Shadowsocks | `Tri4L` + 3 digit | `Tri4L238` |

---

### DELETE /api/vmess/:username

Protected. Hapus user VMess.

**Success (200):**
```json
{ "message": "User vmess1 dihapus" }
```

**Error (404):**
```json
{ "error": "User vmess1 tidak ditemukan" }
```

---

### PUT /api/vmess/:username/renew

Protected. Perpanjang user VMess.

**Request:**
```json
{ "days": 30 }
```

**Success (200):**
```json
{ "message": "VMess vmess1 diperpanjang hingga 2026-09-01", "exp": "2026-09-01" }
```

---

### PUT /api/vmess/:username/quota

Protected. Set quota VMess (GB).

**Request:**
```json
{ "quota": 20 }
```

**Success (200):**
```json
{ "message": "Quota VMess vmess1 = 20 GB" }
```

---

### PUT /api/vmess/:username/iplimit

Protected. Set IP limit VMess.

**Request:**
```json
{ "iplimit": 3 }
```

**Success (200):**
```json
{ "message": "IP limit VMess vmess1 = 3" }
```

---

## Xray — VLESS

Semua endpoint identik dengan VMess, hanya berbeda path dan label:

| Item | Value |
|---|---|
| Base path | `/api/vless` |
| Label response | `VLESS` |
| uidKey | `id` |

### GET /api/vless
### POST /api/vless
### POST /api/vless/trial
### DELETE /api/vless/:username
### PUT /api/vless/:username/renew
### PUT /api/vless/:username/quota
### PUT /api/vless/:username/iplimit

Trial sama dengan VMess: request `{"minutes": 30}`, response `{ "message": "Trial VLESS created", ... }`

Contoh response create:
```json
{
  "message": "VLESS created",
  "data": {
    "username": "vless1",
    "uuid": "660e8400-e29b-41d4-a716-446655440001",
    "exp": "2026-08-02",
    "quota_gb": "10",
    "iplimit": "2"
  },
  "text": "...",
  "base64": "..."
}
```

---

## Xray — Trojan

| Item | Value |
|---|---|
| Base path | `/api/trojan` |
| Label response | `Trojan` |
| uidKey | `password` |

### GET /api/trojan
### POST /api/trojan
### POST /api/trojan/trial
### DELETE /api/trojan/:username
### PUT /api/trojan/:username/renew
### PUT /api/trojan/:username/quota
### PUT /api/trojan/:username/iplimit

Trial sama dengan VMess: request `{"minutes": 30}`, response `{ "message": "Trial Trojan created", ... }`

Contoh response create:
```json
{
  "message": "Trojan created",
  "data": {
    "username": "trojan1",
    "uuid": "770e8400-e29b-41d4-a716-446655440002",
    "exp": "2026-08-02",
    "quota_gb": "10",
    "iplimit": "2"
  },
  "text": "...",
  "base64": "..."
}
```

---

## Xray — Shadowsocks

| Item | Value |
|---|---|
| Base path | `/api/shadowsocks` |
| Label response | `Shadowsocks` |
| uidKey | `password` |

### GET /api/shadowsocks
### POST /api/shadowsocks
### POST /api/shadowsocks/trial
### DELETE /api/shadowsocks/:username
### PUT /api/shadowsocks/:username/renew
### PUT /api/shadowsocks/:username/quota
### PUT /api/shadowsocks/:username/iplimit

Trial sama dengan VMess: request `{"minutes": 30}`, response `{ "message": "Trial Shadowsocks created", ... }`
Catatan: quota default Shadowsocks trial = **5 GB** (bukan 1 GB)

Contoh response create:
```json
{
  "message": "Shadowsocks created",
  "data": {
    "username": "ss1",
    "uuid": "880e8400-e29b-41d4-a716-446655440003",
    "exp": "2026-08-02",
    "quota_gb": "10",
    "iplimit": "2"
  },
  "text": "...",
  "base64": "..."
}
```

---

## Bot Telegram

### GET /api/bot

Protected. Lihat konfigurasi bot Telegram.

**Success (200):**
```json
{
  "token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
  "chat_id": "-1001234567890"
}
```

---

### POST /api/bot

Protected. Set konfigurasi bot Telegram.

**Request:**
```json
{
  "token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
  "chat_id": "-1001234567890"
}
```

**Success (200):**
```json
{ "message": "Bot config saved" }
```

---

## System

### POST /api/system/expired

Protected. Bersihkan semua akun yang sudah expired.

**Success (200):**
```json
{ "message": "Akun expired dibersihkan" }
```

---

### POST /api/system/clear-cache

Protected. Bersihkan cache (nginx, xray, syslog, journal).

**Success (200):**
```json
{ "message": "Cache & log dibersihkan" }
```

---

### GET /api/system/autoreboot

Protected. Lihat jam auto-reboot yang dijadwalkan.

**Success (200):**
```json
{ "hour": 5 }
```

---

### POST /api/system/autoreboot

Protected. Set jam auto-reboot harian.

**Request:**
```json
{ "hour": 5 }
```

**Success (200):**
```json
{ "message": "Auto-reboot diatur jam 5 setiap hari" }
```

---

### POST /api/system/backup

Protected. Backup semua konfigurasi server (passwd, shadow, db files, xray config, domain).

**Success (200):**
```json
{
  "message": "Backup berhasil",
  "file": "/root/backup/sct-backup-2026-07-03.tar.gz"
}
```

---

## Monitor

### GET /api/monitor/ips

Protected. Lihat IP limit per user per protokol.

**Success (200):**
```json
{
  "ssh": { "user1": "2", "user2": "3" },
  "vmess": { "vmess1": "2" },
  "vless": {},
  "trojan": {}
}
```

---

### GET /api/monitor/quota

Protected. Lihat quota usage per user per protokol (dalam bytes).

**Success (200):**
```json
{
  "ssh": { "user1": "10737418240", "user2": "5368709120" },
  "vmess": { "vmess1": "10737418240" },
  "vless": {},
  "trojan": {}
}
```

---

## Global Error

**401 Unauthorized (IP tidak terdaftar di whitelist):**
```json
{
  "error": "IP 203.0.113.100 tidak terdaftar di whitelist",
  "whitelist_path": "/etc/xray/api-whitelist.conf"
}
```

**500 Internal Server Error (unexpected error):**
```json
{ "error": "Pesan error internal" }
```

---

## Data Storage

Semua data disimpan dalam file, tanpa database SQL.

| Data | File Path | Format Baris |
|---|---|---|
| SSH DB | `/etc/ssh/.ssh.db` | `#ssh# <user> <pass> <quota> <iplimit> <exp>` |
| VMess DB | `/etc/vmess/.vmess.db` | `### <user> <exp> <uuid> <quota> <iplimit>` |
| VLESS DB | `/etc/vless/.vless.db` | `### <user> <exp> <uuid> <quota> <iplimit>` |
| Trojan DB | `/etc/trojan/.trojan.db` | `### <user> <exp> <uuid> <quota> <iplimit>` |
| Shadowsocks DB | `/etc/shadowsocks/.shadowsocks.db` | `### <user> <exp> <uuid> <quota> <iplimit>` |
| Xray Config | `/etc/xray/config.json` | JSON dengan marker `#vmess$`, `#vless$`, `#trojanws$`, `#ssws$` |
| IP Whitelist | `/etc/xray/api-whitelist.conf` | satu IP per baris, `#` untuk komentar |
| IP Limits | `/etc/kyt/limit/{ssh,vmess,vless,trojan}/ip/<username>` | angka (jumlah IP) |
| Quota Files | `/etc/{ssh,vmess,vless,trojan}/<username>` | bytes |
| Domain | `/etc/xray/domain`, `/root/domain` | domain name |
| Bot Config | `/etc/bot/.bot.db` | `#bot# <token> <chat_id>` |
| Auto-reboot | `/home/daily_reboot` | cron hour |

---

## VPS Menu Integration

API Server bisa dikelola langsung dari menu VPS:

| Menu | Akses | Aksi |
|---|---|---|
| Main Menu (menu) | Option `10` | Masuk ke menu API Server |
| Menu API (m-api) | Option `1` | Start API Server |
| Menu API (m-api) | Option `2` | Stop API Server |
| Menu API (m-api) | Option `3` | Restart API Server |
| Menu API (m-api) | Option `4` | Lihat logs (`journalctl -u api-server`) |
| Menu API (m-api) | Option `5` | Lihat daftar IP whitelist |
| Menu API (m-api) | Option `6` | Tambah IP ke whitelist |
| Menu API (m-api) | Option `7` | Hapus IP dari whitelist |
| Features (m-ftr) | Option `20` | Start API Server langsung |
| Features (m-ftr) | Option `21` | Stop API Server langsung |
| Features (m-ftr) | Option `22` | Restart API Server langsung |

**Systemd commands:**
```bash
systemctl start api-server
systemctl stop api-server
systemctl restart api-server
systemctl status api-server
journalctl -u api-server -f
```
