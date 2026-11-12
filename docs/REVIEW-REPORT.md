# Event UI — Review＋本機整合修正報告

> 日期：2026-11-12
> 你嘅 UI repo：<https://github.com/napagap/3810-Event-UI>（main @ `8faa541`）
> 主 repo：<https://github.com/sumyu22/3810_EventRegistrationSystem>（**private**）
> 環境：Windows + Node v24；用 `mongodb-memory-server`（唔需要 Atlas）＋真 `server.js`；headless Chrome 截圖
> 狀態：整合完成；已 push 到新 repo <https://github.com/SaltTIA/3810-EventHub-Integrated>（**新 repo，唔影響主 repo 同你個 UI repo**）

---

## 0. 一頁總結

- 你份 UI **功能基本 OK**：Event CRUD（list／new／show／edit／update／delete）＋ Registration list／cancel 都行得通；我整合後用 25 步流程試 run，全部通過。
- 但個 repo **唔完整**：得 8 個檔，冇 `package.json`、`server.js`、`models/Event.js`、`public/`、auth 檔案 → 跟 README 做 `npm install / npm start` 係 run 唔到。
- 主 repo 係 **private**，你個 GitHub account（napagap）似乎未加到 collaborator，所以 **push 唔到上主 repo**；你個 UI repo 亦只係獨立 repo（唔係 fork），唔可以直接開 PR 去主 repo。
- 我開咗一個**新 GitHub repo**（<https://github.com/SaltTIA/3810-EventHub-Integrated>）整合你份 UI＋Part 1 auth＋Part 3 API，順手修咗 P0/P1 問題；測試 **43/43 PASS**，有截圖。
- **原本主 repo 同你個 UI repo 完全冇改**；下面「要你決定嘅事」等你回覆。

---

## 1. Review：做得好嘅地方

- 有跟 MVC 分層：`models/`、`routes/`、`views/`。
- `/events`、`/registrations` 都有 `requireLogin` 保護（未登入會 redirect 去 `/auth/login`）。
- EJS 用 `<%= %>`（escaped），冇明顯 XSS。
- 表單有基本 HTML validation（`required`、`pattern`、`min`、`maxlength`）。
- Edit／Delete 有 confirm dialog，delete 後 redirect 回列表。
- Event list 用 `startAt` 排序；registration list 用 `registeredAt` 倒序。
- 命名清楚、route 路徑直觀。

---

## 2. Review：問題清單（同我嘅處理）

### 🔴 P0（整合前要修）

| 問題 | 位置 | 實測 | 現況 |
|---|---|---|---|
| **取消報名冇驗 owner（IDOR）**：任何登入用戶只要知道 registration id，就可以取消別人報名 | `routes/registrations.js`（cancel route） | 用 Bob 登入，成功取消 Alice 嘅報名 | ✅ 已修（加 `userId` ownership filter） |
| **冇 UI 建立報名**：event details 頁只有 Edit／Delete，冇 Register 按鈕；但 README 話「Registrations created via UI」 | `views/events/show.ejs` | 只能直接 POST `/registrations` | ✅ 已加 Register／Cancel 按鈕 |
| **Read 冇搜尋條件**：只係 `Event.find({})`，未符合 requirement「search data by different query conditions」 | `routes/events.js` | 列表只可以睇全部 | ✅ 已加 keyword／status／category 搜尋 |
| **Repo 唔完整／run 唔到** | repo 根目錄 | 冇 `package.json`、`server.js`、Event model 等 | ✅ 我喺整合版補齊 |

### 🟠 P1

| 問題 | 實測／影響 | 現況 |
|---|---|---|
| Registration 用 `userName` 做 key（User name 唔 unique） | 同名用戶會互通報名記錄 | ✅ 改用 `userId`＋`(eventCode, userId)` unique index |
| 報名唔驗 event 存在／容量／status | 實測報名 `EVT-NOPE-999` 都成功 | ✅ 已加驗證（存在、open、未滿） |
| Update route 直接 `findOneAndUpdate(..., req.body, ...)` | 實測 body 加 `eventCode` 可以改 event key（mass assignment） | ✅ 改 whitelist，唔可以改 eventCode |
| Delete event 唔清 registration | 實測 event 刪咗，registration 仲喺 | ✅ 已加 `Registration.deleteMany` |
| Dashboard 仲係 starter placeholder | 登入後冇 link 去 events／registrations | ✅ 已加卡片／navbar links |
| Cancelled 之後唔可以再報名 | 取消後永遠 blocked | ✅ 已加 re-register（重設 Confirmed） |

### 🟡 P2（已順手改善）

- UI 風格唔一致：event 頁預設 HTML、`new.ejs` 冇 CSS link → 已統一 navbar／table／form／button 風格。
- 錯誤顯示 plain-text 400 → 部分改為 render 返表單＋error message。
- 表單未支援 `description`、`endAt`、`organizer` → 已補。
- Navbar 每頁唔一致（Create Event 漏咗）→ 已抽 shared partial `views/partials/nav.ejs`，6 頁統一。

---

## 3. 我點試 run

1. Clone 你個 UI repo，逐個檔讀。
2. 喺主 repo clone 開 isolated worktree，將你 5 個檔 copy 入去，補上 Part 3 嘅 `models/Event.js`，再喺 `server.js` 加 `/events`、`/registrations` mounts。
3. 用 `mongodb-memory-server` 起真 MongoDB，spawn 真 `server.js`，用 cookie jar 模擬瀏覽器登入，逐步打 form／route。
4. 用 headless Chrome 截圖確認畫面。

**結果**：你份 UI 嘅 25 步流程全部通過；另外我用兩個帳號測到上面嘅 IDOR、mass assignment、orphan 問題（重現到，然後修好再測）。

---

## 4. 我改咗乜（本機整合版）

GitHub repo：<https://github.com/SaltTIA/3810-EventHub-Integrated>（public；main branch，commit `6f877ec` → navbar 修正 `f848626`）

| 改動 | 檔案 |
|---|---|
| 整合 Part 1 auth＋Part 2 UI＋Part 3 REST API | `server.js`、`models/`、`routes/`、`views/` |
| Registration 改 userId＋unique index | `models/Registration.js` |
| IDOR 修正（ownership filter） | `routes/registrations.js` |
| 報名驗 event／容量／status、re-register | `routes/registrations.js` |
| Events 搜尋（keyword／status／category） | `routes/events.js` |
| Update whitelist（唔可以改 eventCode） | `routes/events.js` |
| Delete event 清 registration | `routes/events.js` |
| Event details Register／Cancel 按鈕 | `views/events/show.ejs` |
| Dashboard links＋靚 UI | `views/dashboard.ejs`、`public/css/style.css` |
| Navbar 統一（shared partial） | `views/partials/nav.ejs`＋6 個 views |
| 補 description／endAt／organizer 欄位 | `views/events/new.ejs`、`views/events/edit.ejs` |

---

## 5. 測試結果

- **43/43 checks PASS**（用 mongodb-memory-server ＋真 `server.js`）：
  - 未登入 redirect、register／login／logout
  - Event create／list／search／details／edit／update／delete
  - Register／duplicate 400／cancel／re-register
  - **IDOR 修復驗證**：Alice 取消 Bob 嘅報名 → 404，Bob 仍然 Confirmed
  - **Mass assignment 修復驗證**：update 後 eventCode 冇變
  - 關閉 event 唔可以報名、容量滿 400、報名唔存在 event 404
  - Delete event 會清 registration（冇 orphan）
  - REST API `/api/events` 照舊唔使 login，GET／POST 正常
  - Navbar 6/6 頁一致（Dashboard／Events／My Registrations／Create Event／Log out）

Live demo（我機，in-memory DB）：<http://127.0.0.1:34720/auth/login>（demo@example.com / demo12345）
截圖：repo 內 `docs/screens/`（dashboard／events list／details／registrations／create／edit）

---

## 6. 要你決定嘅事

1. **Push 權限**：主 repo 係 private，你（napagap）未加到 collaborator，所以你 push 唔到。要請 `sumyu22` 去 **Settings → Collaborators → Add people → napagap** 加你；或者我哋開一個新 GitHub repo 放呢個整合版（完全唔影響原本 repo）。
2. **你嘅 `server.js` 改動喺邊？** README 話有改，但 repo 冇 `server.js`；係咪未 push／喺另一個 branch？
3. **整合次序**：建議先 merge Part 3（`models/Event.js` 係 UI 依賴）→ 再合 UI 修正版（IDOR／Register 按鈕／搜尋／whitelist 等）。
4. **你想邊個做 merge？** 可以由你喺自己 branch 修完開 PR，或者我俾修正版 diff／files 你。
5. 今日 11/12，**11/16 前要登記 presentation 時段**，我哋要快啲定整合方案＋彩排。

---

## 7. 建議下一步

1. 你先確認上面第 1–3 點，同 `sumyu22` 講 collaborator 權限。
2. 如果要我幫：我可以將整合版 5 個修正檔（routes／views／model）整理成 patch 俾你。
3. 新 GitHub repo 已開：<https://github.com/SaltTIA/3810-EventHub-Integrated>；你想用就直接 clone／fork（完全唔影響原本 repo）。
4. 之後一齊用真 Atlas `.env` 做一次完整 demo 彩排（login → events → search → register → cancel → delete）。
