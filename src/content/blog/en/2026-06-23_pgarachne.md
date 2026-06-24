---
title: "Architecture Without Boilerplate: When the Database Becomes the API Gateway and AI Becomes the UI"
description: "How to eliminate an entire backend layer using PgArachne and MCP, distribute a system from a single binary, and let AI agents serve as the user interface."
locale: "en"
categories: ["AI", "PostgreSQL"]
date: 2026-06-23
tags: ["PostgreSQL", "PgArachne", "MCP", "AI", "architecture"]
draft: false
translation_id: "2026-06-23_1"
---

Software engineering has a long-standing tendency to layer abstractions. When building a typical web application today, the standard technology stack includes a relational database, an ORM layer (Object-Relational Mapping), a backend framework (Node.js, Python, Go, .NET), validation libraries, JSON serializers, and only then an HTTP server that exposes all of this to the network.

The result is that backend developers spend enormous amounts of time writing so-called “boilerplate” code — mechanically translating database structures into HTTP routes and validating things that are often already validated at the database level.

But if the application’s business logic is tightly coupled to the data model and data integrity, a legitimate question arises: *Do we really need a separate backend application just as a JSON pass-through heater?*

The “Database-as-a-Backend” approach is not conceptually new. However, in combination with [PgArachne](https://www.pgarachne.com) and the new Model Context Protocol (MCP) standard, it gains an entirely new architectural dimension. This article examines in detail how this stack can eliminate an entire application layer, distribute a complete system from a single binary, and enable AI agents to function as the user interface itself.

---

## 1. The Architectural Shift: From Controllers to Pure Database Logic

A traditional REST API requires a route definition, a controller, validation middleware, error handling, and SQL query mapping for every entity. If the table structure or a business rule changes, the developer must update code in multiple places on the backend and then on the frontend as well.

PgArachne completely eliminates this middle layer. Backend development here shrinks to defining the database schema and PL/pgSQL (or PL/v8 or PL/Python) functions. The tool itself acts as a thin, high-performance API gateway written in Go that runs directly in front of PostgreSQL and automatically maps stored procedures and functions to a **JSON-RPC 2.0 API**.

### How Reflection Works in Practice

Once a function accepting and returning the `jsonb` data type exists in the database, PgArachne immediately registers and exposes it through reflection of PostgreSQL system catalogs (`pg_proc`, `pg_namespace`, `pg_argument`). No server restarts, no compilation.

Consider a simple user registration function:

```sql
CREATE OR REPLACE FUNCTION api.register_user(params jsonb)
RETURNS jsonb AS $$
DECLARE
   new_user_id uuid;
   user_email text;
BEGIN
   user_email := lower(trim(params->>'email'));

  -- Validace přímo v databázi
   IF user_email !~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'
   THEN
      RAISE EXCEPTION 'Invalid email address' USING ERRCODE = '22000';
   END IF;

   INSERT INTO users (email, password_hash)
   VALUES (user_email, crypt(params->>'password', gen_salt('bf')))
   RETURNING id INTO new_user_id;

   RETURN jsonb_build_object(
      'status', 'success',
      'user_id', new_user_id
   );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION api.register_user(jsonb) IS 'Registers a new user and returns the user ID. Expects email and password fields.';
```

PgArachne automatically maps this function to a JSON-RPC endpoint. The client application (or AI agent) then sends a standard POST request with the body:

```json
{
   "jsonrpc": "2.0",
   "method": "api.register_user",
   "params": {
      "email": "user@port80.cz",
      "password": "SuperSecretPassword123"
   },
   "id": 1
}
```

### The Hybrid Approach: From Universal CRUD to Strict Logic

This model often runs into concerns about excessive rigidity. What if at the start of a project you don’t want to write a SQL function for every table? And what if later you need extremely complex validations? PgArachne supports a hybrid strategy:

1. **Universal functions (Fast MVP):** At project kickoff, you can enable generic CRUD functions that allow client applications to directly query, filter, and modify tables (similar to what PostgREST does). Frontend development can thus begin immediately.
2. **Dedicated RPC functions (Production hardening):** As the project grows and requires strict business processes (e.g., transactional order processing tied to inventory state), the universal approach is closed off for that entity and replaced with an isolated SQL function. Nothing changes externally for the client application — it still communicates via the JSON-RPC protocol.

---

## 2. The Security Model: Identity Switching via `SET LOCAL ROLE`

One of the most common objections to the “database as backend” architecture concerns security. If the client application communicates directly with the database gateway, how do you prevent user A from reading user B’s data?

PgArachne does not manage authorization or access rights on its own. Instead, it delegates security one hundred percent to the proven core of PostgreSQL and the **Row-Level Security (RLS)** mechanism.

### How It Works at the Database Level:

1. **Authentication (BYO-JWT):** PgArachne supports a *Bring Your Own JWT* model. You can use any external identity provider (Auth0, Clerk, Supabase Auth, or a custom microservice) that signs tokens. You simply provide the gateway with the public key (JWKS) to verify the signature.
2. **Request context:** When an HTTP request arrives, PgArachne verifies the JWT, extracts claims from it (e.g., user ID and role), and opens a transaction to PostgreSQL.
3. **Transaction-level isolation:** At the very beginning of the transaction, the gateway executes a series of context-setting commands:
 ```sql
   SET LOCAL ROLE authenticated;
   SELECT set_config('app.current_user_id', '123e4567-e89b-12d3-a456-426614174000', true);
   ```
4. **RLS policy enforcement:** If you have an RLS policy defined on the `orders` table, PostgreSQL automatically ensures that any subsequent query (even one nested inside a complex function) sees only data belonging to that user:
 ```sql
   CREATE POLICY order_isolation_policy ON orders
   FOR ALL
   TO authenticated
   USING (user_id = current_setting('app.current_user_id')::uuid);
   ```

This approach completely eliminates an entire class of security vulnerabilities known as IDOR (Insecure Direct Object Reference), which commonly arise from developer errors in backend controllers. Security is defined declaratively, right where the data lives.

---

## 3. Distribution from a Single Binary: Static Frontend and JAMstack Without Compromise

Modern deployment often resembles an infrastructure nightmare. You need to manage Docker containers for the Node.js backend, set up a CDN (Content Delivery Network) to distribute the Single Page Application (React/Vue/Svelte), resolve CORS (Cross-Origin Resource Sharing) policies, and configure a reverse proxy (Nginx/Traefik) to tie it all together.

PgArachne approaches this with the pragmatic simplicity of Go. It contains a built-in, highly optimized static file server. This makes it possible to completely change your application deployment strategy.

### Monolithic Distribution with Microservices Benefits

You can build the entire client application as a purely static frontend — no server-side rendering (SSR), just optimized HTML, CSS, and client-side JavaScript. These files are placed in a folder that PgArachne serves.

The advantages of this approach are significant:

* **Zero API overhead:** The client application and the API run on the same domain, the same port, and from the same binary. This eliminates any CORS configuration and reduces network handshake overhead (everything runs over a single HTTP/2 or HTTP/3 connection).
* **Perfect cacheability:** Static assets are immutable. PgArachne automatically generates correct `ETag` and `Cache-Control` headers for them. The entire frontend can thus be extremely efficiently cached directly in the user’s browser or at the network edge (Edge/Cloudflare), while PgArachne processes only pure JSON-RPC data.
* **CI/CD simplicity:** Deploying a new version of the application means only downloading a single binary, copying the static frontend folder, and starting it up. No dependency on `node_modules` in production, no risk of memory leaks from heavy backend runtimes.

### Real-Time Communication Without WebSocket Complexity

If the client application requires live data — such as real-time notifications, inventory updates, or chat — developers typically reach for WebSockets. However, WebSockets are resource-intensive, scale poorly across load balancers, and require complex stateful logic on the backend.

PgArachne solves this problem with native support for **Server-Sent Events (SSE)** coupled with the database’s `LISTEN/NOTIFY` mechanism.

When a change occurs in the database (e.g., via a trigger), PostgreSQL fires an event:
```sql
NOTIFY channel_orders_updates, '{"order_id": 501, "status": "shipped"}';
```
PgArachne captures the notification and immediately forwards it over the open HTTP connection to the frontend using the standard JavaScript `EventSource` client interface:

```javascript
const evtSource = new EventSource("/api/stream?channel=orders_updates");
evtSource.onmessage = (event) => {
   const data = JSON.parse(event.data);
   console.log("Objednávka aktualizována:", data);
};
```
Everything runs unidirectionally, efficiently, over the standard HTTP protocol, and without needing to build dedicated message brokers like Redis.

---

## 4. Model Context Protocol (MCP): The Era of Zero-UI Applications

The most interesting technological breakthrough that PgArachne brings, however, is not about saving lines of code in classical web development, but rather integration with the artificial intelligence ecosystem through the **Model Context Protocol (MCP)**.

MCP is an open protocol (originally designed by Anthropic) that defines a uniform way for LLM models (such as Claude, GPT, or local models) to securely communicate with external data sources, file systems, and application interfaces. PgArachne contains a native MCP server implementation.

### A Self-Documenting API as a Set of Tools

When you connect PgArachne to a development environment (e.g., Cursor, Claude Desktop, or a custom autonomous agent), the gateway introspects the available SQL functions and presents them to the AI model as its internal *tools*.

The key element is standard SQL comments. AI models don’t need to read the source code of tables — they need intelligible semantics. PgArachne takes the text from the `COMMENT ON FUNCTION` statement and passes it to the LLM as a system instruction for that tool.

If the model is tasked with assessing business state, it looks through the tool schema and finds a function described as: *“Returns total revenue and order count for a specified period.”* The model itself understands what parameters (`date_from`, `date_to`) it must generate, assembles a valid JSON-RPC request, PgArachne executes it securely, and the model interprets the raw data for the user in comprehensible text or a chart.

### The Zero-UI Concept: When No Graphical Interface Is Built at All

For a large number of internal enterprise systems, analytical tools, B2 B interfaces, or admin consoles, building a graphical user interface (GUI) is pure waste of engineering time. Developers spend weeks building tables, filters, select boxes, and charts just so a manager or analyst can click a button to export data.

With the PgArachne + MCP architecture, the path opens to so-called **Zero-UI**:

1. **No frontend code:** You create no React, no forms, no CSS.
2. **Natural language as the universal interface:** The user communicates directly with an AI agent (e.g., via chat or a voice interface).
3. **Autonomous execution:** The user says: *“Find me the top 5 customers who spent the most money with us this month but whose last order was more than 10 days ago. I want to send them a retention email.”*
4. **Processing:** The AI agent identifies the necessary functions exposed through PgArachne, retrieves the exact data in a transactional and secure manner (via RLS), formats it into a clear table, and immediately proposes the email copy.

Business logic and data integrity remain one hundred percent under control in PostgreSQL, data transport is handled by the blazing-fast Go server, and the flexible user-facing layer is generated dynamically by AI according to the user’s current need.

---

## 5. When to (Not) Deploy This Architecture: Limits and Risks

Every architectural decision is a trade-off. The “database as backend” architecture is not a silver bullet and has specific limits that must be evaluated before adoption.

### Sweet Spots
* **Data-intensive applications and MVPs:** Projects where time-to-market is critical and where most operations are transactions against the database schema.
* **Internal enterprise tools and ERP sub-systems:** Systems where the primary requirements are security, search speed, and the ability to easily integrate AI agents for reporting.
* **Applications with high real-time update requirements:** Thanks to the direct SSE and `NOTIFY` integration without needing to build complex WebSocket infrastructure.

### Poor Fits (When to Choose a Classical Backend Instead)
* **Heavy reliance on external third parties:** If your API must communicate with three other REST APIs (Stripe, Salesforce, internal microservices) on every request, writing these integrations directly in PL/pgSQL (e.g., via the `http` extension) tends to be clunky and difficult to test. A classical backend in Go or Node.js is more suitable here.
* **Heavy computational operations (CPU-bound):** PostgreSQL is designed for efficient I/O operations and data management. If the application requires complex image processing, advanced cryptography, or heavy mathematical simulations, executing these inside the database process could starve resources from other transactions.
* **Complex microservice orchestration:** In distributed systems where the database is just one of many components and business logic requires coordination via patterns like Saga or Event Sourcing, the classical backend layer serves as an orchestrator — a role the database alone cannot efficiently fulfill.

---

## Conclusion: Pragmatic Leanness for the Modern Era

An architecture built on the combination of PostgreSQL, PgArachne, and the Model Context Protocol represents a radical return to technical sobriety. It demonstrates that much of the complexity we introduce into modern software projects stems solely from the constant effort to shuttle and transform data between incompatible layers.

By removing the intermediate layers — abolishing the classical backend application and replacing it with a thin, highly optimized gateway — we gain a system with minimal overhead, extreme ease of deployment, and native readiness for AI integration. The future of development need not lie in writing thousands of lines of transit code, but in precisely defining the data model and business logic directly where the data lives.
