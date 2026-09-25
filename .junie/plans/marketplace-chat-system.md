---
sessionId: session-260922-121641-cpu3
---

# Requirements

### Overview & Goals
The marketplace chat system provides a secure, direct communication channel between buyers and sellers to discuss vehicle builds and automotive parts. To maximize user safety, preserve platform utility, and protect users from off-platform fraud or disintermediation, all conversations strictly enforce **1:1 user-to-user uniqueness**, **listing context linkage**, and an automated **PII (Personally Identifiable Information) Redaction & Moderation Engine**.

### Scope
#### In Scope
- **Strict 1:1 Conversation Model**: Exactly one persistent conversation thread between any two unique users (User A & User B), regardless of how many different vehicles or parts they discuss over time.
- **Marketplace Listing Context**: Seamless attachment and display of vehicle or part cards inside messages and conversation headers, allowing buyers to inquire directly about specific items.
- **Automated PII Sanitization Engine**: Server-side detection and automatic masking of phone numbers, email addresses, external URLs, social media / messaging handles (Viber, Telegram, WhatsApp, Facebook), and financial/card numbers.
- **Real-time WebSockets via Laravel Reverb**: Live message delivery, typing indicators, and read receipts across private channels.
- **Dual UI Access**:
  - **Floating Chat Drawer**: Interactive slide-up widget on vehicle and part detail pages for instant seller inquiries without leaving the browsing context.
  - **Dedicated Inbox Center (`/messages`)**: Full-screen split-pane messaging hub for managing all buyer and seller discussions.
- **Unread Notification Badges**: Live counters in the navigation bar and user menu for unread messages.

#### Out of Scope
- Voice / video calls.
- Group chat channels (system is strictly 1:1 buyer/seller/agent communication).

### User Stories
- **As a Buyer**, I want to click "Chat with Seller" on a car or part page so that I can ask specific technical questions with the listing's details automatically referenced in the conversation.
- **As a Seller / Dealer**, I want to receive real-time notifications and messages from interested buyers so that I can answer questions and negotiate reservations.
- **As a Marketplace Platform User**, I want to be protected from fraudulent off-platform schemes through automatic PII filtering so that all transactions remain secure and backed by marketplace buyer protection.

### Functional Requirements
1. **Conversation Resolution**: If User A clicks "Chat with Seller" on Seller B's car listing, the system retrieves their existing conversation if one exists, or creates a new 1:1 conversation record with the listing attached as the initial context.
2. **PII Redaction**: Any message containing sensitive personal information (e.g. `Call me at 0917-123-4567` or `Email test@gmail.com`) is sanitized on submission to replace the sensitive portion with an explicit safety notice (e.g. `[Phone Number Redacted for Safety]`) before persisting and broadcasting.
3. **Real-time Delivery**: When a message is sent, the recipient receives a live broadcast event on their private channel if online, updating the unread badge and active chat window.
4. **Read Receipts**: Opening a conversation updates unread messages to `read_at = NOW()` and informs the sender in real time.

# Technical Design

### Current Implementation
- **Authentication**: Laravel Sanctum tokens with multi-role support (`buyer`, `seller`, `dealer`, `parts_seller`, `admin`).
- **Broadcasting Infrastructure**: Laravel Reverb configured in `backend/config/broadcasting.php` and `backend/config/reverb.php`, with frontend client in `frontend/src/realtime/echo.js`.
- **Marketplace Entities**: Existing `cars` and `parts` tables with full seller attribution (`seller_id`).

### Key Decisions
1. **Strict 1:1 Database Constraint**: Normalize conversations with `user_one_id` and `user_two_id` where `user_one_id < user_two_id`. A unique index `UNIQUE(user_one_id, user_two_id)` at the database level physically prevents duplicate threads between any two users.
2. **Context-Aware Polymorphic Listing Linkage**: Messages and conversations maintain optional `listing_type` (`car` or `part`) and `listing_id` fields. When a buyer initiates a chat from a listing, the context is pinned to the message payload, enabling interactive listing preview cards inside the conversation thread.
3. **Automated Server-Side PII Redaction**: A specialized `PiiSecurityService` runs regex heuristics across multiple formats (Philippine mobile/landline numbers, international formats, RFC email specs, URL schemes, Telegram/Viber/WhatsApp patterns, and Luhn-matching card sequences). Redacted messages are marked with `is_redacted = true` and display informative safety indicators.
4. **Hybrid UX (Floating Drawer + Dedicated Inbox)**: On listing detail pages, the chat opens in a floating drawer to preserve browsing flow; users can also navigate to `/messages` for an expansive desktop/mobile conversation management hub.

### Architecture Diagram
```mermaid
graph TD
    subgraph Frontend
        ListingPage[Car / Part Detail Page]
        ChatDrawer[Floating Chat Drawer]
        MessagesHub[/messages Inbox Page]
        EchoClient[Laravel Echo Client]
    end

    subgraph Backend
        ChatController[Chat API Controller]
        PiiService[PiiSecurityService]
        ConvModel[Conversation & Message Models]
        Reverb[Laravel Reverb WebSocket Server]
    end

    ListingPage -->|Click Inquire| ChatDrawer
    ChatDrawer -->|Send Message| ChatController
    MessagesHub -->|Send Message| ChatController
    ChatController -->|Sanitize Content| PiiService
    PiiService -->|Redacted Payload| ConvModel
    ConvModel -->|Broadcast MessageSent| Reverb
    Reverb -->|WebSocket Push| EchoClient
    EchoClient -->|Live State Update| ChatDrawer
    EchoClient -->|Live State Update| MessagesHub
```

### Data Models & Schema
#### `conversations` Table
- `id` (BIGINT UNSIGNED, Primary Key)
- `user_one_id` (BIGINT UNSIGNED, Foreign Key -> users.id, Indexed)
- `user_two_id` (BIGINT UNSIGNED, Foreign Key -> users.id, Indexed)
- `last_message_id` (BIGINT UNSIGNED, Nullable)
- `last_message_at` (TIMESTAMP, Nullable, Indexed)
- `created_at`, `updated_at`
- *Constraints*: `UNIQUE(user_one_id, user_two_id)` where `user_one_id < user_two_id`.

#### `messages` Table
- `id` (BIGINT UNSIGNED, Primary Key)
- `conversation_id` (BIGINT UNSIGNED, Foreign Key -> conversations.id, Cascade Delete)
- `sender_id` (BIGINT UNSIGNED, Foreign Key -> users.id)
- `body` (TEXT)
- `is_redacted` (BOOLEAN, Default: false)
- `listing_type` (VARCHAR 20, Nullable: 'car' | 'part')
- `listing_id` (BIGINT UNSIGNED, Nullable)
- `read_at` (TIMESTAMP, Nullable)
- `created_at`, `updated_at`

### File Structure Changes
```
backend/
├── app/
│   ├── Events/
│   │   ├── MessageSent.php
│   │   └── MessageRead.php
│   ├── Http/
│   │   ├── Controllers/Api/ChatController.php
│   │   ├── Requests/Chat/
│   │   │   ├── SendMessageRequest.php
│   │   │   └── StartConversationRequest.php
│   │   └── Resources/
│   │       ├── ConversationResource.php
│   │       └── MessageResource.php
│   ├── Models/
│   │   ├── Conversation.php
│   │   └── Message.php
│   └── Services/
│       ├── ChatService.php
│       └── PiiSecurityService.php
├── database/migrations/
│   └── 2026_09_22_000001_create_conversations_and_messages_tables.php
└── tests/Feature/
    └── ChatSystemTest.php

frontend/
├── src/
│   ├── api/chat.js
│   ├── components/chat/
│   │   ├── FloatingChatDrawer.jsx
│   │   ├── FloatingChatDrawer.css
│   │   ├── ListingContextCard.jsx
│   │   └── ChatMessageItem.jsx
│   ├── context/
│   │   └── ChatContext.jsx
│   └── pages/
│       ├── Messages.jsx
│       └── Messages.css
```

# Testing

### Validation Approach
Automated feature testing in Laravel (`php artisan test`) coupled with frontend build validation (`npm run build`) verifies that conversation uniqueness, PII redaction rules, listing context binding, and authorization protections operate flawlessly.

### Key Scenarios
1. **1:1 Conversation Idempotency**:
   - Calling `POST /api/v1/chat/conversations` with the same recipient multiple times returns the exact same conversation ID without creating duplicate database rows.
2. **PII Detection & Redaction**:
   - Sending `Text me at 0917-555-1234 or email me at seller@yahoo.com` saves `Text me at [Phone Number Redacted for Safety] or email me at [Email Address Redacted for Safety]`, sets `is_redacted = true`, and informs the sender.
   - Sending `Check my fb https://facebook.com/seller_page` redacts the external link with `[External Link Redacted for Safety]`.
3. **Listing Context Association**:
   - Initiating chat with `listing_type = 'car'` and `listing_id = 1` includes full car data in the message resource and renders the interactive `ListingContextCard` in UI.
4. **Cross-User Authorization**:
   - User C attempting to fetch messages or post to Conversation(User A, User B) receives a `403 Forbidden` response.
5. **Real-time Event Broadcasting**:
   - Dispatching a message triggers `MessageSent` on `private-conversation.{id}` and recipient's `private-user.{id}`.

### Edge Cases
- Self-messaging attempts (User A trying to start a chat with User A) are rejected with a 422 validation error.
- Deleted or unlisted items gracefully fall back to displaying generic listing badges without breaking message history.
- Rapid successive messages handle race conditions smoothly using database transactions.

# Delivery Steps

### ✓ Step 1: Backend Database Schema, Models & PII Sanitization Engine
The database supports unique 1:1 user conversations with listing context, and a robust PII sanitization service automatically redacts sensitive contact details.

- Create migration `backend/database/migrations/2026_09_22_000001_create_conversations_and_messages_tables.php` with unique constraint on `(user_one_id, user_two_id)` where `user_one_id < user_two_id`, foreign keys to users, polymorphically referenced listing columns (`listing_type`, `listing_id`), and message read tracking.
- Create Eloquent models `backend/app/Models/Conversation.php` and `backend/app/Models/Message.php` with relationship definitions (`userOne`, `userTwo`, `messages`, `lastMessage`, `listing`).
- Implement `backend/app/Services/PiiSecurityService.php` with multi-pattern detection and automatic redaction for Philippine and international phone numbers, email addresses, external URLs, social messaging handles (Telegram, Viber, WhatsApp, FB Messenger), and payment card numbers.
- Create unit tests for `PiiSecurityService` validating sanitization coverage and redaction flag generation.

### ✓ Step 2: Backend Chat API, Authorization & Realtime Broadcasting
REST API endpoints and Laravel Reverb private channels allow secure, realtime 1:1 messaging with listing references and authorization guards.

- Implement `backend/app/Http/Controllers/Api/ChatController.php` providing `index` (inbox threads), `store` (get or create 1:1 conversation), `show` (conversation details with listing), `messages` (paginated message log), `sendMessage` (store with PII sanitization), `markRead`, and `unreadCount`.
- Create form request validation classes `backend/app/Http/Requests/Chat/SendMessageRequest.php` and `backend/app/Http/Requests/Chat/StartConversationRequest.php`.
- Implement broadcast event `backend/app/Events/MessageSent.php` broadcasting on private channels `private-conversation.{id}` and `private-user.{recipientId}`.
- Configure private channel authorization rules in `backend/routes/channels.php` ensuring only conversation participants can access chat streams.
- Register chat API routes in `backend/routes/api.php` under `auth:sanctum`.

### ✓ Step 3: Frontend Realtime Chat Context & Floating Chat Drawer
Global realtime chat context and a floating slide-up chat drawer allow buyers and sellers to converse directly on listing pages with live updates.

- Implement `frontend/src/api/chat.js` for API interaction (conversation lookup, message posting, read receipts, unread counter).
- Implement `frontend/src/context/ChatContext.jsx` with global unread counter, active thread management, and Laravel Echo private channel subscriptions.
- Create `frontend/src/components/chat/FloatingChatDrawer.jsx` offering a slide-up floating drawer with real-time message stream, typing feedback, PII safety alert banner, and listing attachment pill.
- Create `frontend/src/components/chat/ListingContextCard.jsx` displaying vehicle/part thumbnail, price, inspection badge, and quick link.
- Update `frontend/src/main.jsx` to wrap the app with `ChatProvider`.

### ✓ Step 4: Listing Integration, Dedicated Inbox & End-to-End Testing
Marketplace listing pages connect to seller chat threads, a dedicated /messages center is available, and test suites confirm functionality.

- Add "Chat with Seller" action buttons in `frontend/src/pages/CarDetail.jsx` and `frontend/src/pages/PartDetail.jsx` that trigger the floating chat drawer with listing context.
- Implement dedicated full-page inbox and thread management in `frontend/src/pages/Messages.jsx` with responsive two-pane navigation and route `/messages` in `frontend/src/App.jsx`.
- Update `frontend/src/App.jsx` and `frontend/src/components/UserMenu.jsx` to display realtime unread badge counters.
- Write comprehensive PHPUnit/Pest feature test suite `backend/tests/Feature/ChatSystemTest.php` testing 1:1 uniqueness, PII redaction, listing attachment, channel authorization, and message dispatch.
- Run test suites and frontend build to verify zero regressions.