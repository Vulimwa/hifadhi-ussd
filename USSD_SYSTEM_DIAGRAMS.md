# Hifadhi Link (USSD) -ERD and Flow Diagrams

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
        string phone
        string name
        string ward
        string village
        string lang
        date   registeredAt
        date   createdAt
        date   updatedAt
    }
    Incident {
        string _id
        string caseId
        string phone
        string userRef
        string species
        string urgency
        string type
        string ward
        string village
        string note
        string status
        date   createdAt
        date   updatedAt
    }
    Alert {
        string _id
        string ward
        string risk
        string window
        string summaryEn
        string summarySw
        string updatedBy
        date   createdAt
        date   updatedAt
    }
    Contact {
        string _id
        string ward
        string kwsHotline
        string wardAdmin
        date   createdAt
        date   updatedAt
    }
    Ward {
        string name
    }
```

Notes:
- `Ward` is a conceptual enum entity backed by a config list (`src/config/wards.js`), not a collection.
- `Incident.userRef` references `User._id` when available; otherwise `phone` is still stored.

## Root Menu
```mermaid
flowchart TD
    A[HIFADHI LINK Root (CON)] --> B[Register]
    A --> C[Report Incident]
    A --> D[Check Alerts]
    A --> E[Prevention Tips]
    A --> F[Emergency Contacts]
    A --> G[Toggle Language]
```

## Flow -Register (1)
```mermaid
flowchart TD
    A[From Root: Register] --> B[Enter Full Name]
    B --> C[Select Ward]
    C --> D[Enter Village]
    D --> E[Confirm: name/ward/village]
    E --> F[Upsert User in DB]
    F --> G[END: Registration Success]
```

## Flow -Report Incident (2)
```mermaid
flowchart TD
    A[From Root: Report] --> B[Species]
    B --> C[Urgency]
    C --> D[Type]
    D --> E{User has Ward?}
    E --> G{User has Village?}
    E --> F[Select Ward]
    F --> G{User has Village?}
    G --> H[Village: Use or Edit]
    H --> I[Enter Village]
    I --> J
    J --> K[Confirm summary]
    K --> L[Create Incident + caseId]
    K --> M[END Invalid/Cancel]
    L --> N[END: Saved Case ID]
```

## Flow -Check Alerts (3)
```mermaid
flowchart TD
    A[From Root: Alerts] --> B{User has Ward?}
    B --> C[Show Ward Alert Summary]
    B --> D[Select Ward]
    D --> C
    C --> E[SMS summary or Back]
    E --> F[END: SMS will be sent]
    E --> G[Return to Root]
```

## Flow -Prevention Tips (4)
```mermaid
flowchart TD
    A[From Root: Tips] --> B[Show Tips]
    B --> C[SMS me tips]
    C --> D[END: SMS will be sent]
```

## Flow -Emergency Contacts (5)
```mermaid
flowchart TD
    A[From Root: Contacts] --> B{User has Ward?}
    B --> C[Show KWS + Ward Admin]
    B --> D[Select Ward]
    D --> C
    C --> E[SMS contacts]
    E --> F[END: SMS will be sent]
```

## Flow -Language Toggle (0)
```mermaid
flowchart TD
    A[From Root: Language] --> B[Toggle EN <-> SW]
    B --> C[Persist to User.lang]
    C --> D[CON: Re-show Root in new language]
```

## Admin -Seeding & Export
```mermaid
flowchart TD
    subgraph Admin_API
        A1[POST /alerts/seed] -->|upsert by ward| A2[(Alert)]
        B1[POST /contacts/seed] -->|upsert by ward| B2[(Contact)]
        C1[GET /export/incidents.csv] -->|CSV| C2[(Incident)]
    end
    N[Header x-admin-token required]
```

## Where Things Live
- USSD Router: `src/ussd/router.js`
- Models: `src/models/User.js`, `src/models/Incident.js`, `src/models/Alert.js`, `src/models/Contact.js`
- Wards enum: `src/config/wards.js`
- Admin routes: `src/web/admin.js`

## How To View
- GitHub and many editors render Mermaid code blocks directly.
- If not, paste code blocks into an online Mermaid viewer to see the diagrams.
