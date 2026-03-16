# RAAS Agent App — Product Requirements Document
> **Product:** RAAS Property Manager — Android Agent App  
> **Version:** 1.0 | **Date:** March 2026  
> **Client:** RAAS Builders & Developers, Thirthahalli, Karnataka  
> **Prepared by:** Atrivex Technology Pvt Ltd  
> **Architect:** Senior Android (Jetpack Compose + Clean Architecture)

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Personas](#3-user-personas)
4. [Architecture Decision](#4-architecture-decision)
5. [Technology Stack](#5-technology-stack)
6. [App Structure & Navigation](#6-app-structure--navigation)
7. [Screen-by-Screen Requirements](#7-screen-by-screen-requirements)
   - [S1 — Splash & Onboarding](#s1--splash--onboarding)
   - [S2 — Home Dashboard](#s2--home-dashboard)
   - [S3 — Property List](#s3--property-list)
   - [S4 — Add / Edit Property](#s4--add--edit-property)
   - [S5 — Photo Management](#s5--photo-management)
   - [S6 — Property Detail View](#s6--property-detail-view)
   - [S7 — Share Preview & Editor](#s7--share-preview--editor)
   - [S8 — Search & Filter](#s8--search--filter)
   - [S9 — Settings & Language](#s9--settings--language)
8. [Photo Handling](#8-photo-handling)
9. [Share Card Generation](#9-share-card-generation)
10. [Bilingual Support (English + Kannada)](#10-bilingual-support-english--kannada)
11. [Local Data Layer](#11-local-data-layer)
12. [Database Schema](#12-database-schema)
13. [Search Architecture](#13-search-architecture)
14. [Non-Functional Requirements](#14-non-functional-requirements)
15. [Development Phases](#15-development-phases)
16. [Risk Register](#16-risk-register)
17. [Appendix — Folder Structure](#17-appendix--folder-structure)

---

## 1. Product Overview

### Problem Statement

RAAS Builders & Developers' field agents currently manage property listings through WhatsApp messages, handwritten notes, and memory. When a buyer enquires, the agent has to search through old chats to find a plot's price, size, location, and photos. Sharing listings is messy — photos are sent one by one without any consistent branding, and prices get miscommunicated.

### What We Are Building

A **simple, fast Android app** for RAAS agents (and the owner) to:

- Store all property listings in one place — with photos, price, size, location, and status
- Search any property in seconds by village, survey number, size, or price range
- Generate a **branded share card** (image) for each listing and send it to buyers via WhatsApp, Instagram, SMS, or any Android share target
- Edit the price or any detail in the share card **just before sharing** — without changing the saved record
- Operate fully in **English or Kannada**, switchable at any time

### What It Is NOT

- Not a buyer-facing app or web portal (the website handles that)
- Not a multi-agent CRM (Phase 1 is single-agent; multi-agent in Phase 2)
- Not a payment or booking system
- Does not require internet to work (100% offline, local-first)

---

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|---|---|---|
| Fast listing creation | Time to add a new property | Under 90 seconds |
| Fast search | Time to find any stored property | Under 5 seconds |
| Share adoption | % of enquiries handled via share card | > 80% within 1 month |
| Dual-language usability | Agent can switch language and find all features | 100% feature parity EN/KA |
| Reliability | App crashes per week | < 1 |
| Offline use | All core features work with no internet | 100% |

---

## 3. User Personas

### Primary — The Field Agent (Ravi, 34)
- Uses a mid-range Android phone (₹8,000–15,000 range)
- Comfortable with WhatsApp and phone camera; not technical
- Often in areas with poor network
- Speaks Kannada natively; reads basic English
- Wants: quick property lookup, instant share to WhatsApp

### Secondary — The Owner / Manager (Boss)
- Reviews all listings, sets prices
- May want to see summary of inventory
- Comfortable with both English and Kannada
- Wants: accurate price control, branded professional shares

---

## 4. Architecture Decision

### Pattern: MVVM + Clean Architecture (3-Layer)

```
┌─────────────────────────────────────────┐
│  PRESENTATION LAYER                     │
│  Jetpack Compose UI + ViewModels        │
│  StateFlow / UiState sealed classes     │
├─────────────────────────────────────────┤
│  DOMAIN LAYER                           │
│  Use Cases (pure Kotlin, no Android)    │
│  Repository Interfaces                  │
│  Domain Models                          │
├─────────────────────────────────────────┤
│  DATA LAYER                             │
│  Room DB (local) + File System (photos) │
│  Repository Implementations             │
│  DAO interfaces                         │
└─────────────────────────────────────────┘
```

**Why MVVM + Clean Architecture for this app:**
- ViewModels survive screen rotation — critical when agent is mid-form in field
- Use cases are unit-testable without Android emulator
- Room gives reliable SQLite with compile-time query verification
- Clear separation means adding a cloud sync layer in Phase 2 only touches the Data layer

### Why NOT other patterns:
- **MVI** — overkill for a 9-screen app; adds unnecessary complexity for the dev team
- **MVP** — legacy pattern; no Compose lifecycle integration
- **No architecture** — fine for a 2-screen app, not maintainable beyond that

### Navigation: Single Activity + Compose Navigation
- One `MainActivity`, all screens are `@Composable` destinations
- `NavHost` with typed `NavArgs` using Kotlin `Serializable`
- Back stack managed by Compose Navigation — no Fragment transactions

---

## 5. Technology Stack

### Core

| Library | Purpose | Version |
|---|---|---|
| Kotlin | Primary language | 2.0+ |
| Jetpack Compose | UI framework | BOM 2024.xx |
| Compose Navigation | Screen routing | 2.7+ |
| ViewModel | UI state survival | Lifecycle 2.8+ |
| StateFlow / Flow | Reactive state | Kotlin Coroutines 1.8+ |
| Hilt | Dependency injection | 2.51+ |
| Room | Local SQLite database | 2.6+ |
| DataStore (Preferences) | Settings (language, agent name) | 1.1+ |

### Photos & Images

| Library | Purpose |
|---|---|
| CameraX | In-app camera capture |
| Coil 3 | Image loading and caching in Compose |
| Android MediaStore | Gallery photo picker |
| Photo Picker API (Android 13+) | System photo picker (no READ_MEDIA permission needed) |
| Canvas API | Share card image generation |

### Sharing

| Library | Purpose |
|---|---|
| Android `ShareCompat` | Share sheet integration |
| `FileProvider` | Secure URI sharing of generated share card image |
| `BitmapFactory` | Composing the share card bitmap |

### Utilities

| Library | Purpose |
|---|---|
| Timber | Logging |
| Kotlin Serialization | JSON for nav args |
| Accompanist Permissions | Runtime permission handling in Compose |
| SplashScreen API | Android 12+ native splash |

### Build

| Tool | Choice |
|---|---|
| Min SDK | API 26 (Android 8.0) — covers 97%+ of Indian market |
| Target SDK | API 35 (Android 15) |
| Build System | Gradle (Kotlin DSL) |
| Version Catalog | `libs.versions.toml` |
| Architecture | Multi-module (`:app`, `:core:data`, `:core:domain`, `:feature:*`) |

---

## 6. App Structure & Navigation

### Navigation Graph

```
SplashScreen
    └── OnboardingScreen (first launch only)
            └── HomeScreen  ◄──────────────────────┐
                    ├── PropertyListScreen           │
                    │       ├── PropertyDetailScreen │
                    │       │       └── SharePreviewScreen
                    │       └── AddEditPropertyScreen
                    │               └── PhotoPickerScreen
                    ├── SearchScreen                 │
                    └── SettingsScreen ──────────────┘
```

### Bottom Navigation (3 tabs)

| Tab | Icon | Label EN | Label KA |
|---|---|---|---|
| Home | 🏠 | Home | ಮನೆ |
| Properties | 📋 | Properties | ಆಸ್ತಿಗಳು |
| Search | 🔍 | Search | ಹುಡುಕು |

Settings accessible via top-right icon on HomeScreen.

---

## 7. Screen-by-Screen Requirements

---

### S1 — Splash & Onboarding

#### Splash Screen
- Uses Android 12+ `SplashScreen` API
- Shows RAAS logo + gold shimmer animation for 1.5 seconds
- Checks if first launch → routes to Onboarding or Home

#### Onboarding (First Launch Only — 2 screens)

**Screen OB-1: Language Selection**
```
┌────────────────────────────┐
│   [RAAS Logo]              │
│                            │
│  Choose your language      │
│  ನಿಮ್ಮ ಭಾಷೆ ಆರಿಸಿ           │
│                            │
│  ┌──────────┐ ┌──────────┐ │
│  │ English  │ │  ಕನ್ನಡ   │ │
│  └──────────┘ └──────────┘ │
└────────────────────────────┘
```
- Selection stored in DataStore
- Can be changed anytime in Settings

**Screen OB-2: Agent Name**
```
┌────────────────────────────┐
│  What is your name?        │
│  ನಿಮ್ಮ ಹೆಸರು ಏನು?            │
│                            │
│  [Text field]              │
│                            │
│  [Get Started →]           │
└────────────────────────────┘
```
- Agent name shown on Home greeting
- Used in share card signature ("Shared by [Agent Name]")

#### Acceptance Criteria
- [ ] Onboarding never shown again after first completion
- [ ] Language selection takes effect immediately on OB-2 screen
- [ ] Agent name can be edited later in Settings

---

### S2 — Home Dashboard

**Purpose:** Quick overview + fast-action entry points.

#### Layout
```
┌────────────────────────────────┐
│  Good morning, Ravi 👋         │
│  ಶುಭೋದಯ, ರವಿ                  │
├────────────────────────────────┤
│  SUMMARY CARDS (horizontal)    │
│  ┌────────┐ ┌────────┐ ┌─────┐ │
│  │  24    │ │   8    │ │  3  │ │
│  │ Total  │ │ Avail  │ │Sold │ │
│  └────────┘ └────────┘ └─────┘ │
├────────────────────────────────┤
│  [+ Add New Property]  (Gold)  │
├────────────────────────────────┤
│  RECENT LISTINGS               │
│  [Property card] [Property card]│
│  [View All →]                  │
├────────────────────────────────┤
│  QUICK SEARCH                  │
│  [ 🔍 Search by village, ID…] │
└────────────────────────────────┘
```

#### Summary Cards Data
- Total properties in DB
- Available (status = Available)
- Sold / Hold count
- Tapping any card navigates to PropertyList filtered by that status

#### Acceptance Criteria
- [ ] Summary counts update in real-time via Flow from Room
- [ ] "Add New Property" button is always visible and one tap away
- [ ] Quick Search bar is focusable from Home (navigates to SearchScreen with keyboard open)
- [ ] Recent listings show last 4 modified properties

---

### S3 — Property List Screen

**Purpose:** Browse all stored properties with visual thumbnails.

#### Layout
```
┌──────────────────────────────────┐
│  ← Properties    [🔍] [Filter ▼] │
├──────────────────────────────────┤
│  Filter chips:                   │
│  [All] [Available] [Hold] [Sold] │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ [Photo] │ Plot No. 14      │  │
│  │         │ Soppugudda, TTH  │  │
│  │         │ 7.5 Cents        │  │
│  │         │ ₹18,00,000  AVAIL│  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ [Photo] │ Survey 45/2      │  │
│  │         │ Agumbe Road      │  │
│  │         │ 12 Cents         │  │
│  │         │ ₹32,00,000  HOLD │  │
│  └────────────────────────────┘  │
│  ...                             │
│             [+ FAB]              │
└──────────────────────────────────┘
```

#### Property Card Contents
- Thumbnail (first photo, or placeholder icon if no photo)
- Property name / Plot number
- Village / Location
- Size (cents / sq ft / acres)
- Price (formatted: ₹18,00,000 or "18 Lakhs")
- Status badge (Available = green, Hold = amber, Sold = red)

#### Sorting Options (dropdown)
- Newest first (default)
- Price: Low to High
- Price: High to Low
- Size: Large first
- Recently shared

#### Acceptance Criteria
- [ ] List loads in under 500ms for up to 500 properties
- [ ] Filter chips are instant (no loading state needed — Room query)
- [ ] FAB (Floating Action Button) scrolls up with list, always visible
- [ ] Swipe left on a card reveals quick-share action
- [ ] Swipe right on a card reveals delete (with confirmation dialog)
- [ ] Empty state shows "ಯಾವುದೇ ಆಸ್ತಿ ಇಲ್ಲ / No properties yet" + Add button

---

### S4 — Add / Edit Property Screen

**Purpose:** The most-used screen. Must be fast and forgiving of mistakes.

#### Form Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Property Name / Plot No. | Text | ✔ | e.g. "Plot 14", "Survey 45/2A" |
| Property Type | Dropdown | ✔ | Residential Plot / Agricultural Land / Farm Land / Commercial Plot / House / Apartment |
| Village / Area | Text + Autocomplete | ✔ | Suggests previously entered villages |
| Taluk | Text | — | Auto-filled if village recognised |
| District | Text | — | Default: "Shivamogga" |
| Survey Number | Text | — | |
| Size | Number + Unit picker | ✔ | Units: Cents / Sq Ft / Sq Mtr / Acres |
| Road Frontage | Number + Unit | — | Feet |
| East-West Dimension | Number | — | Feet |
| North-South Dimension | Number | — | Feet |
| Price | Number | ✔ | Stored in full (₹) |
| Price Type | Radio | ✔ | Total Price / Per Cent / Per Sq Ft |
| Negotiable | Toggle | — | Default: OFF |
| Status | Dropdown | ✔ | Available / Hold / Sold |
| Facing Direction | Dropdown | — | East / West / North / South |
| Description / Notes | Multiline text | — | Max 500 chars |
| Photos | Photo grid | — | Up to 4 photos |

#### Form UX Rules
- Keyboard closes on tap outside any field
- Fields scroll correctly when keyboard is open (WindowSoftInputMode = adjustResize)
- "Save" button stays pinned at bottom, always visible
- All text fields have bilingual placeholders:  
  `"Plot number / ಪ್ಲಾಟ್ ನಂಬರ್"`
- Price field formats with commas automatically as user types (₹18,00,000)
- Validation shows inline error message below the field — not a Toast

#### Edit Mode
- Pre-populates all fields from saved property
- "Last edited" timestamp shown at top
- Changes are auto-saved as draft if user navigates away (restored on re-open)

#### Acceptance Criteria
- [ ] Form can be completed and saved in under 90 seconds for a basic listing
- [ ] Price field accepts only numeric input, formats on-the-fly
- [ ] Village autocomplete works from previously entered values (no internet needed)
- [ ] Unsaved changes prompt a confirmation dialog on back press
- [ ] Edit mode loads existing data within 200ms

---

### S5 — Photo Management

**Purpose:** Add up to 4 photos per property from camera or gallery.

#### Layout (inside Add/Edit Property screen — photo section)
```
┌────────────────────────────────┐
│  Photos (3/4)  [+ Add Photo]   │
│                                │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Photo1│ │Photo2│ │Photo3│   │
│  │ [✕] │ │ [✕] │ │[+] │   │
│  └──────┘ └──────┘ └──────┘   │
│  Drag to reorder                │
└────────────────────────────────┘
```

#### Photo Source Options (Bottom Sheet on "+ Add Photo")
1. **Take Photo** — Opens CameraX in-app camera
2. **Choose from Gallery** — Opens Android Photo Picker (system UI)

#### Photo Rules
- Maximum 4 photos per property
- Minimum 0 photos (photo is optional)
- First photo = thumbnail shown in list and share card
- Drag-to-reorder supported (reordering changes thumbnail selection)
- Photos compressed to max 800KB on save (quality 85%) — keeps storage lean
- Original photos never modified; compressed copy stored in app internal storage

#### Storage Path
```
/data/data/com.raas.agent/files/properties/{property_id}/photo_1.jpg
/data/data/com.raas.agent/files/properties/{property_id}/photo_2.jpg
...
```

#### Acceptance Criteria
- [ ] CameraX opens in under 1 second
- [ ] Photo captured and displayed in grid in under 2 seconds
- [ ] Deleting a photo shows confirmation nudge (no dialog needed — show undo snackbar for 3s)
- [ ] Replacing first photo auto-updates the thumbnail in the property list
- [ ] App total storage usage shown in Settings (for user awareness)

---

### S6 — Property Detail View

**Purpose:** Full view of a property before sharing or editing.

#### Layout
```
┌────────────────────────────────────┐
│ ← Back        [Edit ✏] [Share 📤] │
├────────────────────────────────────┤
│  [Photo 1]  [Photo 2]  [Photo 3]  │  ← Horizontal scrollable
│             ● ○ ○                  │  ← Page indicator
├────────────────────────────────────┤
│  Plot No. 14                       │
│  Soppugudda, Thirthahalli          │
│  ┌──────────┐  ┌──────────────┐   │
│  │ 7.5 Cents│  │  AVAILABLE   │   │
│  └──────────┘  └──────────────┘   │
├────────────────────────────────────┤
│  PRICE                             │
│  ₹ 18,00,000                       │
│  (₹ 2,40,000 per Cent)  Negotiable │
├────────────────────────────────────┤
│  DETAILS                           │
│  Survey No.     45/2A              │
│  Facing         East               │
│  Road Frontage  20 Feet            │
│  District       Shivamogga         │
├────────────────────────────────────┤
│  NOTES                             │
│  Corner plot. Near highway.        │
├────────────────────────────────────┤
│  Added: 12 Mar 2026                │
│  Last Shared: 11 Mar 2026          │
├────────────────────────────────────┤
│  [Share This Property]  (Gold CTA) │
└────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Photo viewer supports pinch-to-zoom on full-screen tap
- [ ] "Share This Property" button is always visible (sticky bottom bar)
- [ ] "Last Shared" date updates every time a share is completed
- [ ] Share button navigates to S7 (Share Preview) — NOT directly to share sheet

---

### S7 — Share Preview & Editor

**Purpose:** The most important differentiator. Agent sees a preview of what will be shared, can edit price/details without changing the saved record, then shares.

#### Concept: "What You Share Is What They See"

The share card is a **generated PNG image** that looks like a branded property brochure. It is rendered on-device using Android Canvas API and shared as an image file — so it works perfectly on WhatsApp, Instagram, Facebook, SMS, etc.

#### Share Preview Screen Layout
```
┌────────────────────────────────────┐
│ ← Back              [Share Now 📤] │
├────────────────────────────────────┤
│  PREVIEW                           │
│  ┌──────────────────────────────┐  │
│  │       [RAAS LOGO]            │  │
│  │  ┌──────────────────────┐   │  │
│  │  │   Property Photo     │   │  │
│  │  └──────────────────────┘   │  │
│  │  Plot No. 14                 │  │
│  │  Soppugudda, Thirthahalli    │  │
│  │  7.5 Cents  |  East Facing  │  │
│  │  ─────────────────────────  │  │
│  │  ₹ 18,00,000                 │  │
│  │  (Negotiable)                │  │
│  │  ─────────────────────────  │  │
│  │  📞 +91 98765 43210          │  │
│  │  Shared by Ravi | RAAS       │  │
│  └──────────────────────────────┘  │
├────────────────────────────────────┤
│  EDIT BEFORE SHARING               │
│  (Changes here do NOT save to DB)  │
│                                    │
│  Display Price  [₹ 18,00,000  ✏]  │
│  Note for buyer [Add a note…   ]   │
│  Show my number [Toggle ON/OFF ]   │
│  Language       [EN] [ಕನ್ನಡ]       │
├────────────────────────────────────┤
│  Share via:                        │
│  [WhatsApp] [Instagram] [More…]    │
└────────────────────────────────────┘
```

#### Editable Fields in Share Preview (WITHOUT saving to DB)
| Field | Editable | Notes |
|---|---|---|
| Display Price | ✔ | Agent may quote a different "asking price" to buyer |
| Add a note | ✔ | Short text appended to share card ("For enquiry call now") |
| Show agent phone number | ✔ (toggle) | Some agents prefer privacy on social posts |
| Share language | ✔ | English or Kannada card generated independently |

#### Share Card Image Specs
- Size: **1080 × 1350 px** (4:5 — ideal for WhatsApp status, Instagram, Facebook)
- Alternative landscape version: **1200 × 628 px** (for web/WhatsApp forward)
- Format: JPEG, quality 90%
- Saved temporarily to cache dir, deleted after 1 hour

#### Share Targets (shown as quick buttons + "More")
- WhatsApp (direct intent to `com.whatsapp`)
- WhatsApp Business (intent to `com.whatsapp.w4b`)
- Instagram Stories (`instagram://story-camera`)
- Android Share Sheet (all remaining apps)

#### Acceptance Criteria
- [ ] Preview renders in under 1.5 seconds on a mid-range device
- [ ] Editing the price in "Edit Before Sharing" updates the preview card live
- [ ] Tapping WhatsApp opens WhatsApp with the image pre-attached; no further steps needed
- [ ] Editing share price does NOT update the stored price in the database
- [ ] Language toggle regenerates the card in Kannada within 1 second
- [ ] Share card always includes RAAS logo in top-right corner
- [ ] Agent phone number toggle remembers last state per agent (DataStore)

---

### S8 — Search & Filter Screen

**Purpose:** Find any property in under 5 seconds. Works fully offline.

#### Search Bar Behaviour
- Auto-focuses keyboard on screen open
- Searches as user types (300ms debounce)
- Clears with X button

#### What Search Covers (full-text search via Room FTS4)
- Property name / plot number
- Village / area name
- Survey number
- Description / notes
- All fields searched simultaneously — one search box

#### Filter Panel (collapsible bottom sheet)
```
Property Type:  [All] [Plot] [Farm] [House] [Commercial]
Status:         [All] [Available] [Hold] [Sold]
Price Range:    [Min ₹] ──●────── [Max ₹]
Size Range:     [Min] ──────●─── [Max] Cents
Facing:         [Any] [East] [West] [North] [South]
Negotiable:     [Any] [Yes Only]
```

#### Search Results Display
- Same card as PropertyList (thumbnail + key details)
- Matched text highlighted in result (bold)
- "X results found" count shown above results
- "No results" state with suggestion to clear filters

#### Kannnada Search
- Searching in Kannada script finds Kannada-tagged fields
- Searching in English also finds transliterated matches (e.g. "thirthahalli" finds "ತೀರ್ಥಹಳ್ಳಿ" if stored in Kannada)

#### Acceptance Criteria
- [ ] Search returns results in under 300ms for a database of 500 properties
- [ ] Filters can be applied together (AND logic)
- [ ] Active filter count shown on filter button badge (e.g. "Filter (3)")
- [ ] Tapping a result opens PropertyDetail directly
- [ ] Recent searches stored (last 5), shown below search bar when field is empty

---

### S9 — Settings & Language Screen

#### Settings Options

| Setting | Type | Default |
|---|---|---|
| App Language | Toggle (EN / KA) | English |
| Agent Name | Text input | Set at onboarding |
| Agent Phone Number | Phone input | — |
| Company Name | Text | "RAAS Builders & Developers" |
| Share Card Logo | Info | RAAS logo (fixed) |
| Share Card Accent Colour | Colour picker (3 presets) | Forest Green |
| Show price on share card | Toggle | ON |
| Show phone on share card | Toggle | ON |
| Storage used | Info text | "Photos: 34 MB" |
| Export all data | Action button | Exports JSON backup |
| About | Info | App version, built by Atrivex |

#### Acceptance Criteria
- [ ] Language toggle applies immediately — no app restart required
- [ ] Agent name change reflects on Home greeting and share cards immediately
- [ ] Export generates a JSON file in Downloads folder (can be used to restore later)

---

## 8. Photo Handling

### Technical Implementation

```kotlin
// CameraX setup in PhotoViewModel
class PhotoViewModel @Inject constructor(
    private val photoRepository: PhotoRepository
) : ViewModel() {

    fun capturePhoto(imageProxy: ImageProxy, propertyId: Long) {
        viewModelScope.launch(Dispatchers.IO) {
            val compressed = compressImage(imageProxy.toBitmap(), maxSizeKb = 800)
            photoRepository.savePhoto(propertyId, compressed)
        }
    }

    private suspend fun compressImage(bitmap: Bitmap, maxSizeKb: Int): ByteArray {
        var quality = 90
        var output: ByteArray
        do {
            val stream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, stream)
            output = stream.toByteArray()
            quality -= 10
        } while (output.size > maxSizeKb * 1024 && quality > 10)
        return output
    }
}
```

### Permissions Strategy

| Android Version | Permission needed | Approach |
|---|---|---|
| Android 13+ (API 33+) | `READ_MEDIA_IMAGES` | Photo Picker API — NO permission needed |
| Android 11–12 (API 30–32) | `READ_EXTERNAL_STORAGE` | Request at runtime |
| Android 8–10 (API 26–29) | `READ_EXTERNAL_STORAGE` | Request at runtime |
| Camera | `CAMERA` | Request on first camera open (Accompanist) |

### Rationale: Photo Picker API preferred
The new Android Photo Picker gives users a system UI to select photos without granting the app access to the entire gallery. This is the privacy-safe approach and avoids the permission dialog entirely on Android 13+.

---

## 9. Share Card Generation

### Implementation Approach: Canvas Drawing

The share card is generated programmatically using Android `Canvas` — NOT a screenshot of a Compose screen. This gives pixel-perfect control at all sizes.

```kotlin
class ShareCardGenerator @Inject constructor(
    private val context: Context,
    private val settings: AgentSettings
) {
    suspend fun generate(
        property: Property,
        overridePrice: String?,        // user-edited price for this share
        customNote: String?,
        language: Language,
        includePhone: Boolean
    ): File = withContext(Dispatchers.Default) {

        val cardWidth  = 1080
        val cardHeight = 1350
        val bitmap = Bitmap.createBitmap(cardWidth, cardHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        drawBackground(canvas, cardWidth, cardHeight)
        drawHeaderBar(canvas, cardWidth)              // RAAS logo + gold rule
        drawPropertyPhoto(canvas, property.photos.firstOrNull())
        drawPropertyDetails(canvas, property, language, overridePrice)
        drawPriceSection(canvas, overridePrice ?: property.formattedPrice)
        drawFooter(canvas, includePhone, settings.agentName, settings.phone, cardWidth, cardHeight)
        if (customNote != null) drawNote(canvas, customNote, cardWidth, cardHeight)

        saveToCacheAndReturn(bitmap)
    }
}
```

### Share Card Sections

```
┌─────────────────────────────────────┐  ← 1080 px wide
│ [RAAS Logo]          Forest bg + gold│  ← Header 120px
│ RAAS Builders & Developers          │
├─────────────────────────────────────┤
│                                     │
│         [Property Photo]            │  ← 600px tall
│                                     │
├─────────────────────────────────────┤
│  📍 Village, Taluk                  │  ← Location bar
├─────────────────────────────────────┤
│  Plot Name           7.5 Cents      │  ← Specs row
│  East Facing         Survey 45/2    │
├─────────────────────────────────────┤
│  ₹ 18,00,000                        │  ← Price (large gold)
│  Negotiable                         │
├─────────────────────────────────────┤
│  "Note from agent here"             │  ← Custom note (optional)
├─────────────────────────────────────┤
│  📞 98765 43210   Ravi | RAAS       │  ← Footer
└─────────────────────────────────────┘  ← 1350 px tall
```

### Kannada Share Card
- All text fields rendered in Kannada when language = KA
- Noto Sans Kannada font bundled in app assets (no internet needed)
- Same layout and design; only text strings differ

---

## 10. Bilingual Support (English + Kannada)

### Implementation: `strings.xml` + runtime locale override

```
res/
  values/
    strings.xml         ← English (default)
  values-kn/
    strings.xml         ← Kannada (kn = ISO 639-1 for Kannada)
```

### Runtime Language Switching (without app restart)

```kotlin
// In SettingsViewModel
fun setLanguage(lang: Language) {
    viewModelScope.launch {
        dataStore.updateData { prefs ->
            prefs.copy(language = lang)
        }
    }
}

// In MainActivity — observe and recreate locale
val locale = if (lang == Language.KANNADA) Locale("kn") else Locale("en")
AppCompatDelegate.setApplicationLocales(LocaleListCompat.create(locale))
// No restart needed with AppCompatDelegate — Compose recomposes automatically
```

### Key Kannada UI Strings (sample)

| English | Kannada |
|---|---|
| Properties | ಆಸ್ತಿಗಳು |
| Add Property | ಆಸ್ತಿ ಸೇರಿಸಿ |
| Search | ಹುಡುಕು |
| Available | ಲಭ್ಯ |
| Hold | ಹೋಲ್ಡ್ |
| Sold | ಮಾರಾಟವಾಗಿದೆ |
| Price | ಬೆಲೆ |
| Share | ಹಂಚು |
| Village | ಗ್ರಾಮ |
| Size | ಗಾತ್ರ |
| Cents | ಸೆಂಟ್ |
| Negotiable | ಮಾತುಕಥೆ ಸಾಧ್ಯ |
| Save | ಉಳಿಸಿ |
| Cancel | ರದ್ದು |
| Edit | ಸಂಪಾದಿಸಿ |
| Delete | ಅಳಿಸಿ |
| Confirm | ದೃಢೀಕರಿಸಿ |
| Settings | ಸೆಟ್ಟಿಂಗ್ |
| No properties yet | ಯಾವುದೇ ಆಸ್ತಿ ಇಲ್ಲ |

### Font Requirement
Bundle `NotoSansKannada-Regular.ttf` and `NotoSansKannada-SemiBold.ttf` in `assets/fonts/` — required for Kannada rendering in share card (Canvas drawing uses custom fonts from assets).

---

## 11. Local Data Layer

### Why Offline-First / Local-Only (Phase 1)

- Agents work in areas with poor signal (Malnad region)
- No monthly server costs — zero infra for Phase 1
- Simple to understand: "your data is on your phone"
- Phase 2 adds cloud backup (Firebase or BizOS backend) — designed to slot in cleanly

### Room Database Setup

```kotlin
@Database(
    entities = [PropertyEntity::class, PhotoEntity::class, ShareLogEntity::class],
    version = 1,
    exportSchema = true       // for migration testing
)
@TypeConverters(Converters::class)
abstract class RaasDatabase : RoomDatabase() {
    abstract fun propertyDao(): PropertyDao
    abstract fun photoDao(): PhotoDao
    abstract fun shareLogDao(): ShareLogDao
}
```

### DataStore (Preferences)
Stores lightweight settings that don't need relational structure:
- Selected language (EN / KA)
- Agent name
- Agent phone number
- Company name
- Show phone toggle (default state)
- Share card colour preference
- App first-launch flag

---

## 12. Database Schema

### Table: `properties`

```sql
CREATE TABLE properties (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,           -- "Plot 14"
    property_type   TEXT NOT NULL,           -- RESIDENTIAL_PLOT, FARM_LAND, etc.
    village         TEXT NOT NULL,
    taluk           TEXT,
    district        TEXT DEFAULT 'Shivamogga',
    survey_number   TEXT,
    size_value      REAL NOT NULL,
    size_unit       TEXT NOT NULL,           -- CENTS, SQFT, SQMTR, ACRES
    road_frontage   REAL,                    -- in feet
    dim_ew          REAL,                    -- east-west in feet
    dim_ns          REAL,                    -- north-south in feet
    price           INTEGER NOT NULL,        -- stored in full rupees
    price_type      TEXT NOT NULL,           -- TOTAL, PER_CENT, PER_SQFT
    negotiable      INTEGER DEFAULT 0,       -- 0=false, 1=true
    status          TEXT NOT NULL DEFAULT 'AVAILABLE',  -- AVAILABLE, HOLD, SOLD
    facing          TEXT,                    -- EAST, WEST, NORTH, SOUTH
    description     TEXT,
    created_at      INTEGER NOT NULL,        -- Unix timestamp
    updated_at      INTEGER NOT NULL,
    last_shared_at  INTEGER                  -- NULL if never shared
);

-- Full-Text Search virtual table (mirrors properties for fast search)
CREATE VIRTUAL TABLE properties_fts USING fts4(
    content='properties',
    name, village, taluk, survey_number, description
);
```

### Table: `photos`

```sql
CREATE TABLE photos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id     INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    file_path       TEXT NOT NULL,           -- absolute path in internal storage
    sort_order      INTEGER NOT NULL,        -- 0 = primary/thumbnail
    created_at      INTEGER NOT NULL
);
```

### Table: `share_log`

```sql
CREATE TABLE share_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id     INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    shared_at       INTEGER NOT NULL,
    display_price   TEXT,                    -- price shown at time of share (may differ)
    custom_note     TEXT,
    platform        TEXT,                    -- WHATSAPP, INSTAGRAM, OTHER
    language        TEXT NOT NULL            -- EN, KA
);
```

### DAOs

```kotlin
@Dao
interface PropertyDao {
    @Query("SELECT * FROM properties ORDER BY updated_at DESC")
    fun getAllProperties(): Flow<List<PropertyEntity>>

    @Query("SELECT * FROM properties WHERE status = :status ORDER BY updated_at DESC")
    fun getByStatus(status: String): Flow<List<PropertyEntity>>

    @Query("SELECT * FROM properties WHERE id = :id")
    suspend fun getById(id: Long): PropertyEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(property: PropertyEntity): Long

    @Delete
    suspend fun delete(property: PropertyEntity)

    // FTS search
    @Query("""
        SELECT p.* FROM properties p
        INNER JOIN properties_fts fts ON p.id = fts.rowid
        WHERE properties_fts MATCH :query
        ORDER BY p.updated_at DESC
    """)
    fun search(query: String): Flow<List<PropertyEntity>>

    @Query("""
        SELECT COUNT(*) FROM properties WHERE status = 'AVAILABLE'
    """)
    fun countAvailable(): Flow<Int>
}
```

---

## 13. Search Architecture

### Approach: Room FTS4 (Full-Text Search)

Room's built-in FTS4 (SQLite full-text search) provides sub-100ms search across all text fields for databases up to 10,000 rows — well beyond what RAAS needs.

### Search Flow

```
User types → 300ms debounce → SearchViewModel.search(query)
    → PropertyRepository.search(query)
        → PropertyDao.search(query)  (FTS4 MATCH)
            → Room returns Flow<List<PropertyEntity>>
                → ViewModel maps to UiState
                    → Compose recomposes with results
```

### Filter Combination

```kotlin
// Use Cases combine FTS search + SQL filters
class SearchPropertiesUseCase @Inject constructor(
    private val repository: PropertyRepository
) {
    operator fun invoke(
        query: String,
        type: PropertyType?,
        status: PropertyStatus?,
        minPrice: Long?,
        maxPrice: Long?,
        minSize: Double?,
        maxSize: Double?,
        facing: Facing?
    ): Flow<List<Property>> = repository
        .search(query)
        .map { results ->
            results.filter { property ->
                (type == null || property.type == type) &&
                (status == null || property.status == status) &&
                (minPrice == null || property.price >= minPrice) &&
                (maxPrice == null || property.price <= maxPrice) &&
                (facing == null || property.facing == facing)
            }
        }
}
```

---

## 14. Non-Functional Requirements

### Performance

| Metric | Target |
|---|---|
| App cold start time | < 2 seconds |
| Property list load (100 items) | < 500ms |
| Search results (500 item DB) | < 300ms |
| Share card generation | < 1.5 seconds |
| Photo capture → display | < 2 seconds |
| Photo load in list (cached) | < 100ms |

### Device Requirements

| Requirement | Value |
|---|---|
| Minimum Android version | Android 8.0 (API 26) |
| Target Android version | Android 15 (API 35) |
| Minimum RAM | 2 GB |
| Storage required (app install) | < 25 MB |
| Storage for photos (estimate) | ~3 MB per property |
| Works offline | 100% — no network required |
| Portrait orientation only | Yes (Phase 1) |

### Reliability
- Zero crash tolerance for data entry (all writes are transactions in Room)
- Draft auto-save prevents data loss on unexpected exit
- Photos stored in internal storage (not cleared by system automatically)

### Accessibility
- Minimum touch target size: 48 × 48 dp (Material 3 guideline)
- Font size respects system font scale (use `sp` not `dp` for text)
- Sufficient colour contrast for use in bright sunlight (field use case)

### App Size
- Target APK size: < 15 MB (Noto Sans Kannada font adds ~2 MB)
- Use Android App Bundle (`.aab`) for Play Store — assets delivered on-demand

---

## 15. Development Phases

### Phase 1 — Core App (8 Weeks)

| Week | Deliverable |
|---|---|
| 1 | Project setup: multi-module, DI (Hilt), Room, Navigation scaffold, Design System (colours, typography, components) |
| 2 | S1 Splash + Onboarding, S9 Settings, DataStore, Language switching |
| 3 | S4 Add/Edit Property (form, validation, save to Room) |
| 4 | S5 Photo Management (CameraX, Photo Picker, compression, storage) |
| 5 | S3 Property List (Room Flow, filter chips, sorting, cards) |
| 6 | S6 Property Detail View, S2 Home Dashboard (live counts) |
| 7 | S8 Search (FTS4, filter panel) + S7 Share Preview (Canvas card generation) |
| 8 | WhatsApp share intent, Kannada share card, polish, testing, Play Store build |

**Phase 1 Milestone:** Agent can add, search, and share any property listing. Full English + Kannada support. Offline-only.

### Phase 2 — Cloud Backup & Multi-Agent (4–6 Weeks, future)

- Firebase Firestore sync (or BizOS backend if built)
- Multi-agent with owner overview dashboard
- Push notifications ("New enquiry on Plot 14")
- Buyer enquiry form on website → appears in app
- Property status update from WhatsApp reply (AI parsing)

### Phase 3 — Advanced Features (future)
- Watermark agent's name/brand on exported photos
- Video support (30-second clip per property)
- GPS map pin for each property
- Route planner for site visits

---

## 16. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Kannada font rendering issues on older Android | MEDIUM | HIGH | Bundle Noto Sans Kannada in assets; test on API 26 emulator |
| CameraX compatibility on cheap Android devices | MEDIUM | MEDIUM | Use CameraX (handles device quirks); test on Redmi, Realme devices |
| Share card PNG too large for WhatsApp | LOW | MEDIUM | Compress output to max 1.5 MB; WhatsApp accepts up to 16 MB |
| Agent uses phone in very bright sunlight | HIGH | MEDIUM | High-contrast design; large text sizes; avoid light-grey-on-white |
| Agent accidentally deletes property | MEDIUM | HIGH | Soft-delete with 30-day recycle bin in Phase 1.1 |
| Internal storage full on low-end phone | LOW | MEDIUM | Warn when storage < 100 MB remaining; prompt to review old listings |
| Language switch breaks form mid-edit | LOW | LOW | Language switch only applies after current screen exits (not mid-form) |
| WhatsApp share intent changes | LOW | HIGH | Use generic `ACTION_SEND` as fallback; WhatsApp direct as enhancement |
| Room migration issues on app update | MEDIUM | HIGH | Export schema, write migration tests, always increment db version |

---

## 17. Appendix — Folder Structure

```
raas-agent-app/
├── app/
│   └── src/main/
│       ├── MainActivity.kt
│       ├── RaasApplication.kt
│       └── navigation/
│           └── RaasNavGraph.kt
│
├── core/
│   ├── data/
│   │   ├── database/
│   │   │   ├── RaasDatabase.kt
│   │   │   ├── dao/
│   │   │   └── entity/
│   │   ├── repository/
│   │   └── datastore/
│   ├── domain/
│   │   ├── model/
│   │   ├── repository/     ← interfaces only
│   │   └── usecase/
│   └── ui/
│       ├── theme/           ← Colours, Typography, Shapes
│       └── components/      ← Shared composables (PropertyCard, etc.)
│
├── feature/
│   ├── home/
│   ├── property-list/
│   ├── add-edit-property/
│   ├── property-detail/
│   ├── share-preview/
│   ├── search/
│   └── settings/
│
└── assets/
    └── fonts/
        ├── NotoSansKannada-Regular.ttf
        └── NotoSansKannada-SemiBold.ttf
```

### Design System Colours (matching RAAS brand)

```kotlin
object RaasColors {
    val Forest      = Color(0xFF1A3C34)   // Primary background (dark)
    val Forest2     = Color(0xFF122B25)
    val Forest3     = Color(0xFF0D1F1B)
    val Gold        = Color(0xFFC9A84C)   // Primary accent
    val Gold2       = Color(0xFFE8C96A)
    val Gold3       = Color(0xFFF5E6B8)
    val Cream       = Color(0xFFFAF7F2)   // Light background
    val Terra       = Color(0xFFC4622D)   // Sold badge
    val Sand        = Color(0xFFE8DCC8)
    val Mid         = Color(0xFF5C7068)   // Body text
    val White       = Color(0xFFFFFFFF)

    // Status colours
    val StatusAvail = Color(0xFF22C55E)   // Green
    val StatusHold  = Color(0xFFEAB308)   // Amber
    val StatusSold  = Color(0xFFEF4444)   // Red
}
```

---

## Summary — Decision Points for Approval

| Decision | Choice | Reason |
|---|---|---|
| Platform | Android only (Kotlin + Jetpack Compose) | 95%+ of target users on Android; single codebase |
| Architecture | MVVM + Clean (3-layer) | Testable, scalable to Phase 2 cloud sync |
| Local DB | Room + FTS4 | Compile-time safety, offline-first, fast search |
| Photos | CameraX + Photo Picker API | Best UX, no storage permission on Android 13+ |
| Share mechanism | Canvas-generated PNG via ShareCompat | Works on all apps; no screenshot glitches |
| Language | English + Kannada (AppCompatDelegate, no restart) | Instant switch; Noto Sans Kannada bundled |
| Offline | 100% offline Phase 1 | Malnad network reality; zero infra cost |
| Min SDK | API 26 (Android 8.0) | 97%+ India coverage per Play Console |
| Module structure | Multi-module | Feature isolation, faster builds, Phase 2 ready |
| Share card size | 1080 × 1350 px (4:5 ratio) | WhatsApp status, Instagram, Facebook all accept |

---

*RAAS Agent App PRD v1.0 — Atrivex Technology Pvt Ltd — Confidential*  
*Built for RAAS Builders & Developers, Thirthahalli, Karnataka*
