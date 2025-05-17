## Product Requirements Document: Custom QR Code API

**Version:** 1.0
**Date:** October 26, 2023
**Author:** AI Assistant (for RJX75)

**1. Introduction**
This document outlines the requirements for a Custom QR Code API. The API will allow developers to programmatically generate standard and customized QR codes. It will feature a simple API key mechanism for accessing generation and premium features, without requiring full user authentication for individual users of the API key holder. The API will be built using Node.js, Express, and TypeScript.

**2. Goals**
*   Provide a simple, fast, and reliable API for QR code generation.
*   Enable users to customize the appearance of their QR codes (colors, logos, etc.).
*   Offer premium features for advanced use cases.
*   Implement a straightforward API key system for access control and future monetization.
*   Ensure the API is easy to integrate and use by developers.

**3. Target Audience**
*   Developers building applications that require QR code functionality.
*   Marketing agencies creating campaigns with branded QR codes.
*   Businesses needing customized QR codes for products, events, or information sharing.
*   SaaS providers looking to integrate QR code generation into their platforms.

**4. User Stories**

*   **API Key Management:**
    *   As a developer, I want to be able to request a unique API key so I can access the QR code generation service.
*   **Basic QR Code Generation:**
    *   As a developer, I want to make an API call with data (e.g., a URL) and receive a standard QR code image.
*   **Custom QR Code Generation:**
    *   As a developer, I want to specify parameters like foreground color, background color, and an embedded logo URL to generate a branded QR code.
    *   As a marketer, I want to be able to change the shape of the "eyes" or the dot pattern of the QR code for a unique look.
*   **Premium Features:**
    *   As a premium user, I want to generate dynamic QR codes where I can change the destination URL later without changing the QR code itself.
    *   As a premium user, I want to get basic analytics on my dynamic QR codes (e.g., number of scans).
    *   As a premium user, I want to be able to generate QR codes in bulk from a list of data inputs.
    *   As a premium user, I want to generate QR codes with higher error correction levels for better scannability even if partially obscured.

**5. Functional Requirements**

**5.1. API Key Management**
    *   `GET /apikey`:
        *   Generates a new, unique API key.
        *   Stores the API key (e.g., in-memory for V1, database for V2+).
        *   Returns the API key to the user.
        *   No authentication required to get an API key (for simplicity in this version).
        *   Rate limiting may be applied to this endpoint to prevent abuse.

**5.2. QR Code Generation (Protected by API Key)**
    *   All QR generation endpoints will require a valid API key passed in a header (e.g., `X-API-Key`).
    *   Middleware to validate the API key.

    **5.2.1. Basic QR Code**
        *   Input:
            *   `data`: (String, required) The content to encode (URL, text, vCard, etc.).
            *   `size`: (Integer, optional, default 256) Size of the QR code image in pixels.
            *   `format`: (Enum, optional, default 'png') Output format ('png', 'svg').
        *   Output: QR code image in the specified format.

    **5.2.2. Custom QR Code**
        *   Input (extends Basic QR Code inputs):
            *   `foregroundColor`: (String, optional, hex code, default '#000000') Color of the QR code modules.
            *   `backgroundColor`: (String, optional, hex code, default '#FFFFFF') Color of the background.
            *   `logoUrl`: (String, optional) URL of an image to embed in the center of the QR code.
                *   The API will fetch this image and embed it.
                *   Consider constraints on logo size and format.
            *   `logoScale`: (Float, optional, default 0.2) Scale of the logo relative to the QR code size (0.0 to 1.0).
            *   `logoMargin`: (Integer, optional, default 4) Margin around the logo.
            *   `logoBackgroundColor`: (String, optional, hex code) Background color for the logo area if needed (e.g. to make it opaque).
            *   `quietZone`: (Integer, optional, default 4) Width of the quiet zone around the QR code (in modules).
            *   `errorCorrectionLevel`: (Enum, optional, default 'M') 'L', 'M', 'Q', 'H'.

    **5.2.3. Premium Feature: Advanced Customization**
        *   Input (extends Custom QR Code inputs):
            *   `eyeShape`: (Enum, optional, default 'square') 'square', 'rounded', 'dots'. (Depends on library capabilities)
            *   `dotStyle`: (Enum, optional, default 'square') 'square', 'dots', 'rounded'. (For the main data modules)
            *   `eyeColor`: (String, optional, hex code) Allow different colors for the three main "eyes" (position detection patterns). Could be a single color or an object `{ outer: '#...', inner: '#...' }`.

**5.3. Premium Features (Specific Endpoints - Protected by API Key)**

    **5.3.1. Dynamic QR Codes**
        *   Requires a persistent data store (e.g., PostgreSQL, MongoDB).
        *   `POST /qr/dynamic/create`:
            *   Input: `targetUrl` (String, required), and any customization options from 5.2.2/5.2.3.
            *   Generates a short unique ID for the QR code.
            *   Stores the mapping: `shortId -> targetUrl` and customization parameters.
            *   Generates a QR code that encodes a URL like `https://your-api-domain.com/r/{shortId}`.
            *   Returns: The QR code image and the `shortId` or management URL.
        *   `PUT /qr/dynamic/{shortId}/update`:
            *   Input: `newTargetUrl` (String, required).
            *   Updates the `targetUrl` for the given `shortId`.
            *   Requires the same API key used to create it.
        *   `GET /r/{shortId}` (Public, no API key):
            *   Redirects to the `targetUrl` associated with `shortId`.
            *   Logs the scan event for analytics (see 5.3.2).

    **5.3.2. QR Code Analytics (for Dynamic QR Codes)**
        *   `GET /qr/dynamic/{shortId}/analytics`:
            *   Requires the same API key used to create the dynamic QR.
            *   Returns:
                *   `totalScans`: (Integer)
                *   (Future: scan history with timestamps, unique scans, user agent, approximate location if IP is logged and geolocated).

    **5.3.3. Bulk QR Code Generation**
        *   `POST /qr/bulk/generate`:
            *   Input:
                *   `jobs`: (Array of objects, required) Each object contains `data` and optional customization parameters (as in 5.2.1, 5.2.2, 5.2.3).
                *   Global customization options that apply to all jobs if not specified per job.
            *   Output: A ZIP file containing all generated QR codes, or an array of JSON objects with image data (e.g., base64 encoded) or links to stored images.
            *   This could be an asynchronous operation for large batches.

**6. API Endpoints Summary**

*   **API Key Management:**
    *   `GET /api/v1/apikey`
*   **QR Generation (requires `X-API-Key` header):**
    *   `POST /api/v1/qr/generate` (Handles basic and custom QR parameters in request body)
*   **Premium Features (requires `X-API-Key` header):**
    *   `POST /api/v1/qr/dynamic/create`
    *   `PUT /api/v1/qr/dynamic/{shortId}/update`
    *   `GET /api/v1/qr/dynamic/{shortId}/analytics`
    *   `POST /api/v1/qr/bulk/generate`
*   **Public Redirect (for Dynamic QRs):**
    *   `GET /r/{shortId}`

**7. Technical Requirements**
*   **Stack:** Node.js, Express.js, TypeScript.
*   **QR Code Library:** A robust library like `qrcode` (for basic/custom) or potentially `qr-image` or a more specialized one if advanced shaping is a strong requirement. For logo embedding, image manipulation libraries like `sharp` or `jimp` will be needed.
*   **API Key Storage:**
    *   V1: Persistent store (e.g., Redis, PostgreSQL, MongoDB).
*   **Dynamic QR/Analytics Storage:** Persistent database (e.g., PostgreSQL, MongoDB).
*   **Deployment:** Containerized (e.g., Docker).
*   **Error Handling:** Consistent JSON error responses with appropriate HTTP status codes.
*   **Documentation:** API documentation (e.g., Swagger/OpenAPI).

**8. Non-Functional Requirements**
*   **Performance:** QR code generation should be fast (e.g., < 500ms for typical requests). Redirects for dynamic QR codes should be very fast (< 50ms).
*   **Scalability:** The API should be designed to handle a growing number of requests. Stateless design where possible.
*   **Reliability:** High uptime.
*   **Security:**
    *   API keys should be reasonably unique and hard to guess.
    *   Protection against common web vulnerabilities (XSS, CSRF not directly applicable to API, but good practices).
    *   Rate limiting on API key generation and potentially on QR generation per API key.
    *   Sanitize all inputs, especially URLs for logos or dynamic QR targets to prevent SSRF.
*   **Maintainability:** Clean, well-documented, and testable code.

**9. Data Models (Conceptual - for features requiring persistence)**

*   **ApiKey:**
    *   `key`: string (unique, indexed)
    *   `createdAt`: timestamp
    *   `status`: enum (active, inactive)
    *   `tier`: string (e.g., 'free', 'premium_v1') - for future use
    *   `usageCount`: integer (optional, for rate limiting/analytics)
*   **DynamicQRCode:**
    *   `shortId`: string (unique, indexed)
    *   `apiKey`: string (references ApiKey.key)
    *   `targetUrl`: string
    *   `originalDataEncoded`: string (the URL like `https://your-api-domain.com/r/{shortId}`)
    *   `customizationParams`: JSON (stores all customization options used)
    *   `createdAt`: timestamp
    *   `updatedAt`: timestamp
*   **ScanEvent:**
    *   `scanId`: string (UUID)
    *   `dynamicQRCodeId`: string (references DynamicQRCode.shortId)
    *   `scannedAt`: timestamp
    *   `ipAddress`: string (consider privacy implications)
    *   `userAgent`: string
    *   `geolocation`: JSON (optional, derived from IP)

**10. Future Considerations / Roadmap**
*   User accounts and self-serve API key management UI.
*   Subscription tiers and billing integration (Stripe).
*   More advanced analytics (geographic heatmaps, device types, scan trends).
*   QR code designer UI.
*   Support for more QR code content types (WiFi, vCard, Calendar events as structured inputs).
*   Webhooks for scan events.
*   Different output types (e.g., EPS for print).
*   Template system for QR designs.

**11. Success Metrics**
*   Number of API keys generated.
*   Number of QR codes generated per day/week/month.
*   API response time.
*   API uptime.
*   Adoption rate of premium features (once implemented and potentially monetized).
*   Developer satisfaction (measured via feedback, GitHub issues if open source).

**12. Out of Scope (for V1)**
*   User authentication system (beyond simple API key generation).
*   Billing and payment processing.
*   A web UI for generating QR codes (API-first).
*   Complex analytics dashboards.
*   Guaranteed SLAs for uptime/performance (best effort for V1).
