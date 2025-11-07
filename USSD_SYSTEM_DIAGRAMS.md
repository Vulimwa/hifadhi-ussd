# Hifadhi Link (USSD) — ERD and Flow Diagrams

This document provides visual diagrams of the data model (ERD) and each USSD flow so anyone can quickly understand how the system works by looking at it.

## End‑to‑End Request Flow
```mermaid
sequenceDiagram
    autonumber
    participant AT as Africa's Talking (USSD)
    participant API as Express Server (/ussd)
    participant USSD as USSD Router
    participant DB as MongoDB (Mongoose)

    AT->>API: POST form (sessionId, phoneNumber, text)
    API->>USSD: Parse & route request
    USSD->>DB: Read User by phone
    DB-->>USSD: User (if exists)
    USSD->>USSD: Determine flow from first segment
    alt Registration/Incident updates
        USSD->>DB: Upsert User / Create Incident
        DB-->>USSD: OK
    else Read‑only flows (Alerts/Tips/Contacts)
        USSD->>DB: Read Alert/Contact by ward
        DB-->>USSD: Document or null
    end
    USSD-->>API: Text starting with CON or END
    API-->>AT: 200 OK + body
    AT-->>User: Renders USSD screen
```

## Entity‑Relationship Diagram (ERD)
The system centers on users, their incidents, and ward‑specific alerts/contacts.

```mermaid
erDiagram
    User ||--o{ Incident : reports
    Ward ||--|| Alert : has
    Ward ||--|| Contact : has
    Ward ||--o{ Incident : occurs_in
    Ward ||--o{ User : resides_in

    User {
        string _id
        string phone PK, unique
        string name
        string ward
        string village
        enum   lang (EN,SW)
        date   registeredAt
        date   createdAt
        date   updatedAt
    }
    Incident {
        string _id
        string caseId PK, unique
        string phone
        ObjectId userRef FK -> User._id
        enum   species (elephant,buffalo,lion,other)
        enum   urgency (now,today,24h)
        enum   type (crop,livestock,fence,human)
        string ward
        string village
        string note (<=80)
        enum   status (new,ack,closed)
        date   createdAt
        date   updatedAt
    }
    Alert {
        string _id
        string ward PK, unique
        enum   risk (LOW,MED,HIGH)
        string window
        string summaryEn
        string summarySw
        string updatedBy
        date   createdAt
        date   updatedAt
    }
    Contact {
        string _id
        string ward PK, unique
        string kwsHotline
        string wardAdmin
        date   createdAt
        date   updatedAt
    }
    Ward {
        string name PK  // Config enum: Sagalla, Marungu, Mbololo, Kasigau
    }
```

Notes:
- `Ward` is a conceptual enum entity backed by a config list (`src/config/wards.js`), not a collection.
- `Incident.userRef` references `User._id` when available; otherwise `phone` is still stored.

## Root Menu
```mermaid
flowchart TD
    A[HIFADHI LINK Root (CON)] -->|1| B[Register]
    A -->|2| C[Report Incident]
    A -->|3| D[Check Alerts]
    A -->|4| E[Prevention Tips]
    A -->|5| F[Emergency Contacts]
    A -->|0| G[Toggle Language]
```

## Flow — Register (1)
```mermaid
flowchart TD
    A[Root -> 1 Register] --> B[Enter Full Name]
    B -->|valid| C[Select Ward]
    B -->|invalid| B
    C --> D[Enter Village]
    D -->|<=24 chars| E[Confirm: name/ward/village]
    D -->|>24| D
    E -->|1 Yes| F[Upsert User in DB]
    E -->|2 Edit| B
    F --> G[END: Registration Success]
```

## Flow — Report Incident (2)
```mermaid
flowchart TD
    A[Root -> 2 Report] --> B[Species]
    B --> C[Urgency]
    C --> D[Type]
    D --> E{User has Ward?}
    E -->|Yes| G{User has Village?}
    E -->|No| F[Select Ward]
    F --> G{User has Village?}
    G -->|Yes| H[Village: 1 Use / 2 Edit]
    G -->|No| I[Enter Village]
    H -->|1 Use| J[Optional Note (or 0)]
    H -->|2 Edit| I
    I --> J
    J --> K[Confirm summary]
    K -->|1 Submit| L[Create Incident + caseId]
    K -->|2 Cancel| M[END Invalid/Cancel]
    L --> N[END: Saved Case ID]
```

## Flow — Check Alerts (3)
```mermaid
flowchart TD
    A[Root -> 3 Alerts] --> B{User has Ward?}
    B -->|Yes| C[Show Ward Alert Summary]
    B -->|No| D[Select Ward]
    D --> C
    C --> E[1 SMS summary / 0 Back]
    E -->|1| F[END: SMS will be sent]
    E -->|0| G[Return to Root]
```

## Flow — Prevention Tips (4)
```mermaid
flowchart TD
    A[Root -> 4 Tips] --> B[Show Tips]
    B --> C[1 SMS me tips]
    C --> D[END: SMS will be sent]
```

## Flow — Emergency Contacts (5)
```mermaid
flowchart TD
    A[Root -> 5 Contacts] --> B{User has Ward?}
    B -->|Yes| C[Show KWS + Ward Admin]
    B -->|No| D[Select Ward]
    D --> C
    C --> E[1 SMS contacts]
    E --> F[END: SMS will be sent]
```

## Flow — Language Toggle (0)
```mermaid
flowchart TD
    A[Root -> 0 Language] --> B[Toggle EN ↔ SW]
    B --> C[Persist to User.lang]
    C --> D[CON: Re‑show Root in new language]
```

## Admin — Seeding & Export
```mermaid
flowchart TD
    subgraph Admin API [/admin]
        A1[POST /alerts/seed] -->|upsert by ward| A2[(Alert)]
        B1[POST /contacts/seed] -->|upsert by ward| B2[(Contact)]
        C1[GET /export/incidents.csv] -->|CSV| C2[(Incident)]
    end
    note right of Admin API: Header x-admin-token required
```

## Where Things Live
- USSD Router: `src/ussd/router.js`
- Models: `src/models/User.js`, `src/models/Incident.js`, `src/models/Alert.js`, `src/models/Contact.js`
- Wards enum: `src/config/wards.js`
- Admin routes: `src/web/admin.js`

## How To View
- GitHub and many editors render Mermaid code blocks directly.
- If not, paste code blocks into an online Mermaid viewer to see the diagrams.

