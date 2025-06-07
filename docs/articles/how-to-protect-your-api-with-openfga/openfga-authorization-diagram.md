# OpenFGA Authorization Model Diagram

This diagram represents the relationships and permissions defined in the OpenFGA DSL for the PurrFect Sitter application.

## Entity Relationship Diagram

```mermaid
graph TB
    %% Entity Types
    User[👤 User]
    System[🏢 System]
    Cat[🐱 Cat]
    CatSitting[🏠 Cat Sitting]

    %% System Relations
    System -->|admin| User

    %% Cat Relations
    Cat -->|owner| User
    Cat -->|system| System
    Cat -->|admin| System

    %% Cat Sitting Relations
    CatSitting -->|sitter| User
    CatSitting -->|cat| Cat
    CatSitting -->|system| System
    CatSitting -->|admin| System

    %% Derived Relations
    Cat -.->|can_manage| User
    CatSitting -.->|owner| Cat
    CatSitting -.->|active_sitter| User
    CatSitting -.->|pending_sitter| User

    %% Legend
    subgraph Legend
        direction TB
        Direct[Direct Relation]
        Derived[Derived/Computed Relation]
        Direct --- Derived
        style Derived stroke-dasharray: 5 5
    end
```

## Permissions Matrix

```mermaid
graph TD
    %% Permissions for Cat Sitting
    subgraph "Cat Sitting Permissions"
        CanView[can_view]
        CanUpdate[can_update]
        CanDelete[can_delete]
        CanPostUpdates[can_post_updates]
        CanReview[can_review]
    end

    %% Roles
    Admin[System Admin]
    Owner[Cat Owner]
    ActiveSitter[Active Sitter]
    PendingSitter[Pending Sitter]
    AnySitter[Any Sitter]

    %% Permission Assignments
    Admin --> CanView
    Admin --> CanUpdate
    Admin --> CanDelete

    Owner --> CanView
    Owner --> CanUpdate
    Owner --> CanDelete
    Owner --> CanPostUpdates

    ActiveSitter --> CanPostUpdates

    PendingSitter --> CanUpdate
    PendingSitter --> CanDelete

    AnySitter --> CanView

    %% Special conditional permission
    Owner -.->|if completed| CanReview

    %% Cat Permissions
    subgraph "Cat Permissions"
        CanManage[can_manage]
    end

    Admin --> CanManage
    Owner --> CanManage
```

## Conditional Logic Flow

### Time-based Conditions

```mermaid
---
config:
  layout: dagre
  theme: mc
---
flowchart TD
    CurrentTime["Current Time"]:::time
    StartTime["Start Time"]:::time
    EndTime["End Time"]:::time
    TimeCheck{"Timecheck"}:::decision
    ActiveSitter["Active Sitter"]:::state
    PendingSitter["Pending Sitter"]:::state
    CanPostUpdates["can_post_updates"]:::perm
    CanUpdateDelete["can_update,can_delete"]:::perm

    CurrentTime --> TimeCheck
    StartTime --> TimeCheck
    EndTime --> TimeCheck
    TimeCheck -- "current &gt;= start AND current &lt;= end" --> ActiveSitter
    TimeCheck -- current &lt; start --> PendingSitter
    ActiveSitter --> CanPostUpdates
    PendingSitter --> CanUpdateDelete

    %% Class Definitions
    classDef time fill:#cce6ff,stroke:#204080,stroke-width:2px,color:#204080;       %% light blue
    classDef decision fill:#ecd6fd,stroke:#7934a3,stroke-width:2px,color:#7934a3;   %% light purple
    classDef state fill:#caffd9,stroke:#21875d,stroke-width:2px,color:#21875d;      %% mint green
    classDef perm fill:#fff0cc,stroke:#805d20,stroke-width:2px,color:#805d20;       %% light orange

```

### Status-based Conditions

```mermaid
---
config:
  layout: dagre
  theme: mc
---
flowchart TD

    CatSittingStatus[Current Cat Sitting Status]:::status

    CatSittingStatus --> StatusCheck{Status Check}:::decision
    StatusCheck -->|status in completed_statuses| ReviewPermission[Owner can review completed sitting]:::perm

    %% Category class definitions
    classDef status fill:#cce6ff,stroke:#204080,stroke-width:2px,color:#204080;       %% light blue

    classDef state fill:#caffd9,stroke:#21875d,stroke-width:2px,color:#21875d;
    classDef decision fill:#ecd6fd,stroke:#7934a3,stroke-width:2px,color:#7934a3;
    classDef perm fill:#fff0cc,stroke:#805d20,stroke-width:2px,color:#805d20;
```

## Key Relationships

### Direct Relations

- **System**: Has admin users
- **Cat**: Has an owner (user) and belongs to system
- **Cat Sitting**: Has a sitter (user), references a cat, belongs to system

### Computed Relations

- **Cat admin**: Inherited from system admin
- **Cat can_manage**: Owner OR system admin
- **Cat Sitting owner**: Derived from the associated cat's owner
- **Cat Sitting admin**: Inherited from system admin

### Conditional Relations

- **Active Sitter**: Sitter during active timeslot (current_time >= start_time AND current_time <= end_time)
- **Pending Sitter**: Sitter before timeslot starts (current_time < start_time)
- **Can Review**: Cat owner can review only if cat sitting is completed

### Permission Rules

- **can_view**: Admin OR owner OR any sitter
- **can_update**: Admin OR owner OR pending sitter
- **can_delete**: Admin OR owner OR pending sitter
- **can_post_updates**: Owner OR active sitter
- **can_review**: Cat owner (if sitting is completed)

## Concrete Examples

### Basic Cat Owner Relationship

```mermaid
---
config:
  theme: mc
  layout: elk
---

flowchart LR
    Bob["User:Bob"]:::user
    Alice["User:Alice"]:::user
    Admin["User:Admin"]:::user

    Romeo["Cat:Romeo"]:::cat
    Whiskers["Cat:Whiskers"]:::cat

    System1["System:PurrfectSitter"]:::system

    Bob -- owner --> Romeo
    Alice -- owner --> Whiskers
    System1 -- admin --> Admin

    classDef user fill:#cce6ff,stroke:#204080,stroke-width:2px,color:#204080;
    classDef cat fill:#fff0cc,stroke:#805d20,stroke-width:2px,color:#805d20;
    classDef system fill:#caffd9,stroke:#21875d,stroke-width:2px,color:#21875d;
```

### Cat Sitting Scenario

```mermaid
---
config:
  theme: mc
  layout: elk
---
graph LR
    Bob[User:Bob]:::user -->|owner| Romeo[Cat:Romeo]:::cat
    Alice[User:Alice]:::user -->|sitter| Sitting1["Cat Sitting:Romeo's Weekend."]:::cat_sitting
    Sitting1 -->|cat| Romeo
    %% Derived relationships
    Romeo -.->|owner| Sitting1

    %% Category classes
    classDef user fill:#cce6ff,stroke:#204080,stroke-width:2px,color:#204080;
    classDef cat fill:#fff0cc,stroke:#805d20,stroke-width:2px,color:#805d20;
    classDef cat_sitting fill:#ecd6fd,stroke:#7934a3,stroke-width:2px,color:#7934a3;
```

### Who Can Do What - Permission Example

```mermaid
---
config:
theme: mc
layout: elk

---

flowchart LR
Bob["User:Bob"] -- can_manage --> Romeo["Cat:Romeo"]
Bob -- can_view, can_update, can_delete --> Sitting1@{ label: "Cat_Sitting: Romeo's Weekend" }
Alice["User:Alice"] -- can_view --> Sitting1
Alice -- sitter --> Sitting1
Alice -. if active timeslot .-> Updates["can_post_updates"]
Alice -. if pending timeslot .-> Pending["can_update,can_delete"]
Bob -. if sitting completed .-> Review["can_review"]
Sitting1@{ shape: rect}
```
