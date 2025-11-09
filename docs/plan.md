
# 🏗️ Architecture – Linux Server Manager

## 🧩 Stage-1

> A secure web interface to execute and stream terminal commands to remote Linux servers — built with **Next.js**, **MongoDB**.

---

## 📦 Core Technologies

| Layer         | Tech              | Purpose                                  |
| ------------- | ----------------- | ---------------------------------------- |
| Frontend      | **Next.js**       | Web UI + API routes                      |
| Terminal UI   | **xterm.js**      | Browser-based terminal (real-time shell) |
| SSH Client    | **ssh2**          | Connects to remote Linux servers         |
| Database      | **MongoDB**       | Stores server login credentials          |
| Auth          | Any JWT / Session | Ensures only logged-in users access SSH  |

---

## 🧠 App Behavior

### ✅ User Flow:

1. ✅ User logs into web app
2. ✅ Selects a server from saved list
3. ✅ Opens interactive terminal in browser
4. ✅ Types commands → streamed via WebSocket
5. ✅ SSH connection is **closed on logout or timeout**

---

## 🗂 MongoDB (Database) Design

### `servers` collection:

Stores Linux server credentials.

```json
{
  _id: "ObjectId",
  name: "App Server 1",
  ip: "192.168.1.100",
  port: 22,
  username: "ubuntu",
  privateKey: "<AES encrypted>",
  ownerId: "User ID",
  guestIds: ["Guest User ID"],
  status: "inactive",
}
```

> Optional: Add tags, region, or labels for grouping

---

## ✅ Supported Features

* ✅ Interactive commands (`nano`, `htop`, etc.)
* ✅ Streamed output with `xterm.js`
* ✅ MongoDB-stored server credentials (one per user)
* ✅ SSH via IPV6 and password (optional)

---

## 🛡 Security Rules

| Rule                                | Purpose                  |
| ----------------------------------- | ------------------------ |
| ✅ Auth required for SSH or terminal | Prevent anonymous access |
| ✅ SSH credentials encrypted         | Secure key handling      |
| ❌ server logs                       | history saved in log table   |
| ✅ SSH session ends on logout        | Auto-cleanup             |

---


## ✅ Included (By Design)

* ❌ server logging in log table
* ❌ audit trails or history
* ❌ user roles or teams (user management)
* ❌ (SFTP) file upload/download

---

## 🧩 Stage-2 Features & Enhancements

| Feature               | Add Later? |
| --------------------- | ---------- |
| Servers health status | ✅         |
| File browser (SFTP)   | ❌         |
| Role-based access     | ❌         |

---
