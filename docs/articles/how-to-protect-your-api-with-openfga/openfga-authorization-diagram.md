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
    CurrentTime["Current Time"] --> TimeCheck{"Time Check"}
    StartTime["Start Time"] --> TimeCheck
    EndTime["End Time"] --> TimeCheck
    TimeCheck -- "current &gt;= start AND current &lt;= end" --> ActiveSitter["Active Sitter"]
    TimeCheck -- current &lt; start --> PendingSitter["Pending Sitter"]
    ActiveSitter --> CanPostUpdates["can_post_updates"]
    PendingSitter --> CanUpdateDelete["can_update, can_delete"]
```

### Status-based Conditions

```mermaid
---
config:
  layout: dagre
  theme: mc
---
flowchart TD

    Status[Cat Sitting Status]

    %% Status-based conditions
    Status --> StatusCheck{Status Check}
    StatusCheck -->|status in completed_statuses| CanReview[Can Review Permission]

    %% Permissions granted
    CanReview --> ReviewPermission[Owner can review completed sitting]
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
    Bob["User:Bob"] -- owner --> Romeo["Cat:Romeo"]

    Alice["User:Alice"] -- owner --> Whiskers["Cat:Whiskers"]
    System1["System:PurrfectSitter"] -- admin --> Admin["User:Admin"]

```

### Cat Sitting Scenario

```mermaid
---
config:
  theme: mc
  layout: elk
---
graph LR
    Bob[User:Bob] -->|owner| Romeo[Cat:Romeo]
    Alice[User:Alice] -->|sitter| Sitting1@{ label: Cat Sitting:Romeo's Weekend. }
    Sitting1 -->|cat| Romeo

    %% Derived relationships
    Romeo -.->|owner| Sitting1
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
