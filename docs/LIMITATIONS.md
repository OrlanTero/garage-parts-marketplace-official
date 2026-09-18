# Project Scope & Excluded Limitations Matrix

This document defines the strict architectural boundaries and out-of-scope system limitations for the **Garage Parts & Enthusiast Cars Marketplace**. 

The following items are explicitly **EXCLUDED** from the application roadmap, backend architecture, and client implementations.

---

## 🚫 Excluded Scope & Project Limitations

| # | Limitation Item | Scope Boundary & Technical Rationale |
|---|---|---|
| **1** | **Dedicated React Native Android/iOS applications** | The platform is architected and optimized exclusively as responsive Web Single-Page Applications (SPAs) built with React 18, Vite, and mobile-responsive viewport CSS. Native mobile wrappers and separate App Store deployments are excluded. |
| **2** | **VIN scanner and paid VIN data lookup** | Automated camera barcode/OCR VIN scanners and paid 3rd-party vehicle identification number decoders (e.g. NHTSA / CarVertical / DataOne paid APIs) are not integrated. Vehicle specifications are entered via standard taxonomy and seller-supplied details. |
| **3** | **Carfax / AutoCheck-type vehicle history services** | Proprietary automotive history databases, title brand registries, and insurance salvage history APIs are excluded. Vehicle history and records rely directly on seller-uploaded documentation. |
| **4** | **Custom AI/ML model training** | Custom deep learning, neural network pipelines, tensor training jobs, and proprietary LLM training/hosting are excluded. The system relies on deterministic business rules, standard database full-text search, and relational indexing. |
| **5** | **AI damage detection** | Computer vision image classification for automatic collision/scratch damage appraisal from uploaded photos is out of scope. |
| **6** | **Full 3D vehicle modeling or photogrammetry** | Interactive WebGL 3D chassis mesh rendering, LiDAR point clouds, and multi-camera photogrammetry reconstruction are excluded. Media is managed via optimized 2D photographic galleries and video embeds. |
| **7** | **Financing / bank integrations** | Auto loan pre-approval engines, credit scoring bureaus, and third-party bank financing origination APIs are excluded. Transactions are direct marketplace purchases or cash/wire arrangements. |
| **8** | **Insurance integrations** | Auto insurance quoting engines, carrier binder integrations, and risk underwriting APIs are excluded. |
| **9** | **Escrow services** | Multi-party third-party banking escrow accounts, title custodial holds, and complex escrow release conditions are excluded in favor of standard direct marketplace checkout, payment capture, and return dispute handling. |
| **10** | **Advanced vehicle inspection network** | Fleet mechanics dispatch networks, mobile inspector scheduling apps, and multi-facility certified inspection station routing are excluded. |
| **11** | **Large-scale dealer DMS/API synchronization** | Bi-directional API syncing with automotive Dealership Management Systems (e.g. CDK Global, Reynolds & Reynolds, DealerSocket) is excluded. Inventory is managed directly through the platform's Admin & Seller consoles. |
| **12** | **Enterprise BI / data warehouse** | Snowflake, BigQuery, OLAP multi-dimensional cubes, and enterprise ETL pipelines are excluded. Operational metrics and reporting utilize MySQL aggregation queries and application-level analytics. |
| **13** | **High-availability multi-region infrastructure** | Active-active multi-datacenter GeoDNS routing, cross-continental database replication, and multi-region failover clusters are excluded. The platform is targeted for single-region high-performance deployment (Nginx edge caching, Redis memory layers, PHP-FPM, and MySQL 8). |
| **14** | **Complex multi-country tax/regulatory implementation** | Dynamic cross-border VAT calculation engines, multi-jurisdiction customs tariff calculation, and multi-country tax compliance frameworks are excluded. Platform tax rules adhere to a unified domestic standard rate. |

---

## 🎯 In-Scope Core Capabilities

For clarity, the platform strictly focuses on:
- **Responsive Storefront & Admin Portal**: React 18, Vite 5, React Router v6, Lucide icons, responsive layout tokens.
- **RESTful Marketplace API**: Laravel 11, PHP 8.2+, MySQL 8 with composite B-tree indexing and optimized PDO persistence.
- **Real-Time Broadcasting**: Laravel Reverb WebSocket server (port 8080) for instant inventory updates and admin telemetry.
- **Edge Performance & Caching**: Nginx FastCGI microcaching with `stale-while-revalidate`, cache bypass for authenticated mutations, and static asset TTL optimization.
- **Core Marketplace Operations**: Vehicle showroom listings, parts catalog with fitment taxonomy, seller KYC verification, customer review moderation, order fulfillment tracking, return dispute mediation, and seller payout ledgers.
