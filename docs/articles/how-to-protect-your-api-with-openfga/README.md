---
title: 'How to Protect Your API with OpenFGA: From ReBAC Concepts to Practical Usage'
published: false
description: Learn how to implement complex authorization patterns using OpenFGA and Relation-Based Access Control (ReBAC) through a practical example of a cat sitting app.
tags: tutorial, openfga, authorization, security
cover_image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/faoyboj4ihjrn3msync4.png
---

<script async defer src="https://buttons.github.io/buttons.js"></script>

Another client story, another article. A client asked me recently:

> _Can we add temporary permissions for a group of users assigned to a maintenance task while it's ongoing?_

Simple enough — until I examined the authorization code and found a **500-line** function checking user roles and groups, time windows, resource ownership, and various business rules.

Unlike authentication, where we have OIDC, JWT, and other established standards (that no one reads) and patterns, authorization often forces us into custom implementations.

> You might argue that OAuth 2.0 cover authorization, but they focus on third-party access, not complex and dynamic authorization patterns.

<!-- TODO: Distinction between authentication and authorization -->

Each new policy adds another **conditional branch**, another **database join**, another **custom role**, another **edge case that breaks** during the next feature request. The code becomes a maze and even experienced developers hesitate before touching it.

![this is fine](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/09cwef7zad5jqr7grjz7.png)

Traditional approaches quickly hit walls:

- **RBAC** works until you need "sometimes" permissions
- **ABAC** offers flexibility but becomes a rule engine nightmare
- **Database queries** slow to a crawl as your permission matrix grows

> _What if there was a better way? A way that lets you express complex relationships without tangled code or performance hits?_

My exploration for a better paradigm started with [**Ory Keto**](https://www.ory.sh/keto), when [integrating Ory in a NestJS application](https://dev.to/getlarge/integrate-ory-in-a-nestjs-application-4llo).

{% link https://dev.to/getlarge/integrate-ory-in-a-nestjs-application-4llo %}

It introduced me to [Google's Zanzibar paper](https://storage.googleapis.com/gweb-research2023-media/pubtools/5068.pdf) and the concept of **Relation-Based Access Control (ReBAC)**.

That "simple" feature request led me to [**OpenFGA**](https://openfga.dev) — a richer implementation of Zanzibar's principles that extends ReBAC with powerful features like contextual-based conditions, attribute-based access, and a simple query language.

And since you might be familiar with this story, in this article, I'll share my **learning journey:**

1. ✅ The Authorization Problem
2. 📍 **ReBAC and OpenFGA concepts** ← You are here
3. ⬜ [Why OpenFGA?](#why-openfga)
4. ⬜ [OpenFGA in Action](#openfga-in-action)
5. ⬜ [Testing permissions with OpenFGA CLI](#testing-permissions-with-openfga-cli)
6. ⬜ [Adoption Challenges and Strategies](#adoption-challenges-and-strategies)

## <a id="rebac-and-openfga-concepts"></a> ReBAC and OpenFGA concepts [▓░░░░░░░]

I'll walk you through ReBAC using PurrfectSitter, a cat sitting app where owners find sitters. Real problems, real solutions.
As trivial as it sounds, this example shows:

- Role-based access control (RBAC) for admins
- Attribute-based access control (status-driven permissions)
- Time-based access control
- Resource ownership and management

### Three Building Blocks

ReBAC builds authorization from three simple pieces:

#### Types: Entities in Your App

```yaml
type user
type system
type cat
type cat_sitting
type review
```

These map to your app's core entities:

- `user`: 👤 People using your app
- `system`: 🏢 Admin access controls
- `cat`: 🐱 Furry clients needing care
- `cat_sitting`: 🏠 A sitting arrangement
- `review`: 📝 Post-sitting feedback

Each **type** will declare relationships with other types - in the **type definition**.

> **Note**: In Ory Keto, these are called **namespaces**.

#### Objects: Instances of Types

In OpenFGA, an **object** is an instance of a type. For example:

- `user:bob`: A specific user named Bob
- `cat:romeo`: A specific cat named Romeo
- `system:development`: The development environment
- `cat_sitting:1`: The first cat sitting arrangement
- `review:1`: The first review

Objects are the concrete entities your users interact with.

#### Users: The Actors

A **user** is an entity that is related to objects in your system. In our app, users can be:

- People (like Bob)
- Systems (like the PurrfectSitter development environment)
- Cats (like Romeo)

> **Note**: In Ory Keto, these are called **subjects**. I believe subject is less ambiguous than user, but OpenFGA uses user, so we will too.

#### Relations: How Things Connect

A **relation** defines how users interact with objects. For example:

- `user:bob owner cat:romeo`: Bob is the owner of Romeo
- `user:anne sitter cat_sitting:1`: Anne is the sitter for the first cat sitting arrangement

Each **relation** evaluation logic is defined in the **relation definition**.

```yaml
type system
  relations
    define admin: [user]

type cat
  relations
    define owner: [user]
    define admin: admin from system
    define can_manage: owner or admin
    define system: [system]

type cat_sitting
  relations
    define active_sitter: [cat_sitting#sitter with is_active_timeslot]
    define can_post_updates: owner or active_sitter
    define can_review: [cat#owner with is_cat_sitting_completed]
    define cat: [cat]
    define owner: owner from cat
    define sitter: [user]
```

> **Important**: For the sake of this example, we will assume that cats are owned by humans. We all know that, in reality, cats own us, not the other way around.

OpenFGA computes relationships in several ways:

- **Direct**:
  - `system.admin` — A _user_ can be an **admin** of the _system_
  - `cat.owner` — A _user_ can be a _cat_ **owner**
  - `cat.system` — A _system_ can be assigned to a _cat_
  - `cat_sitting.sitter` — A _user_ can be a **sitter** for a _cat_sitting_
- **Implied**:
  - `cat.admin: admin from system` — An
  - `cat_sitting.owner: owner from cat` — inherit **from** the cat's owner
- **Union**:
  - `cat.can_manage` — either the _cat_ **owner** or an _admin_ from the _system_ can manage the _cat_
  - `cat_sitting.can_post_updates` — either the _cat_sitting_ **owner** or an _active_sitter_ can post updates
- **Conditional**:
  - `cat_sitting.active_sitter` — Conditional relation between _user_ and _cat_sitting_ based on the outcome of the `is_active_timeslot` condition
  - `cat_sitting.can_review` — Conditional relation between _user_ and _cat_sitting_ based on the outcome of the `is_cat_sitting_completed` condition

There are even more ways to express relationships, such as **exclusion**, **intersection** and **nesting**, you can find the complete **configuration language** reference in the [OpenFGA documentation](https://openfga.dev/docs/configuration-language).

<!-- TODO: all concepts in details -> https://openfga.dev/docs/concepts -->

### The Complete Authorization Model

The ensemble of types and relations definitions forms the **authorization model**.
Here, the PurrfectSitter's authorization model in OpenFGA's configuration language (Domain-Specific Language for the purists), defines how users interact with cats, cat sittings, and reviews.

```yaml
model
  schema 1.1

type user

type system
  relations
    define admin: [user]

type cat
  relations
    define admin: admin from system
    define can_manage: owner or admin
    define owner: [user]
    define system: [system]

type cat_sitting
  relations
    define admin: admin from system
    define active_sitter: [cat_sitting#sitter with is_active_timeslot]
    define pending_sitter: [cat_sitting#sitter with is_pending_timeslot]
    define can_post_updates: owner or active_sitter
    define can_delete: admin or owner or pending_sitter
    define can_view: admin or owner or sitter
    define can_update: admin or owner or pending_sitter
    define can_review: [cat#owner with is_cat_sitting_completed]
    define cat: [cat]
    define owner: owner from cat
    define sitter: [user]
    define system: [system]

type review
  relations
    define admin: admin from system
    define author: owner from cat_sitting
    define can_delete: admin or author
    define can_edit: admin or author
    define can_view: [user, user:*]
    define cat: cat from cat_sitting
    define cat_sitting: [cat_sitting]
    define subject: sitter from cat_sitting
    define system: [system]

condition is_active_timeslot(current_time: timestamp, end_time: timestamp, start_time: timestamp) {
  current_time >= start_time && current_time <= end_time
}

condition is_pending_timeslot(current_time: timestamp, start_time: timestamp) {
  current_time < start_time
}

condition is_cat_sitting_completed(cat_sitting_attributes: map<string>, completed_statuses: list<string>) {
  cat_sitting_attributes["status"] in completed_statuses
}
```

Notice how readable, yet compact, this is — no complex SQL joins or nested conditions. The model captures business logic naturally.

<!-- TODO: mention the JSON equivalent -->

![Nice one Johnny](https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmxxeTI3NXg0MmI4a2xlZDEzYXo3MzhxanF3Ym9oajlxdXR0cmU0byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kQdtQ8JIYFRuoywakC/giphy.gif)

> Hint: You can visualize the relations graph and run queries in the [OpenFGA's Playground](https://openfga.dev/docs/getting-started/setup-openfga/playground):

![OpenFGA Playground generated from PurrfectSitter model](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/oh2yxuh779j5yesvpbkd.png)

{% codesandbox 23948skjfksjdf %}

## <a id="why-openfga"></a> Why OpenFGA [▓▓▓░░░░]

### It Matches How You Think

#### Expressive Relationships

Cat owners own cats. Sitters sit cats. Admins administrate. The authorization model mirrors reality instead of forcing you into artificial role hierarchies.

![Cat owner relationship diagram](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/t4g6q9mu4ag4crg09qcr.png)

![Cat sitting scenario diagram](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/g7m1b1h5wlxuwaitssi7.png)

#### Time Works Automatically

No more "grant permission at 9 AM, revoke at 5 PM" cron jobs. Time-based access happens naturally through conditions.
Grant permissions only when conditions are met—like during scheduled hours.

> _Yes! My client is going to love this._

![Time-based conditions](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/xcsdz1o5zg2po3zwpddq.png)

#### Status Drives Decisions

Your app's workflow already has statuses—pending, active, completed. OpenFGA uses these directly for permissions instead of requiring separate access control flags.

![Status-based conditions](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/y45ufry7ecg7lva4rnqm.png)

### Queries, Not Just Checks

Traditional systems answer "Can Alice do X?" OpenFGA also answers "What can Alice do?" and "Who can do X?" This unlocks features like smart dashboards and permission audits.

![Is user Jenny related to system development as an admin?](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/3gljlmtefso79v0rdas9.png)

![Is user Bob related to system development as an admin?](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/xtofky2w1j14uxygu40a.png)

### Scale Like Google

Google's [Zanzibar](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/) (which inspired OpenFGA) handles billions of authorization checks daily. Your application(s) probably won't hit those numbers, but it's nice to know you won't hit a wall due to a poorly performing authorization system.

<!-- TODO: mention benchmark script to compare DB lookups vs OpenFGA -->

### Simpler To Maintain

Let's implement a function with Typescript to check if a user can update a cat sitting arrangement. We'll compare two approaches: a plain database lookup and an OpenFGA check method.

#### Database Lookup Approach

```ts
async function isSystemAdmin(userId: string): Promise<boolean> {
  const user = await userRepository.findById(userId);
  if (!user) return false;
  return user.role === 'admin';
}

async function checkCatSittingUpdatePermission(
  userId: string,
  sittingId: string
): Promise<boolean> {
  const sitting = await catSittingRepository.findById(sittingId);
  if (!sitting) return false;

  const cat = await catRepository.findById(sitting.catId);
  if (!cat) return false;

  const isOwner = cat.ownerId === userId;
  const isSitter = sitting.sitterId === userId;
  const isAdmin = () => await isSystemAdmin(userId);
  const isPending = () =>
    sitting.status === 'requested' && new Date(sitting.startTime) > new Date();

  return isOwner || (isSitter && isPending()) || isAdmin();
}
```

#### OpenFGA Approach

```ts
async function checkCatSittingUpdatePermission(
  userId: string,
  catSittingId: string
): Promise<boolean> {
  const openfgaClient = new OpenFgaApi({
    apiUrl: process.env.OPENFGA_API_URL,
  });

  const request: CheckRequest = {
    tuple_key: {
      user: `user:${userId}`,
      relation: 'can_update',
      object: `cat_sitting:${catSittingId}`,
    },
    context: {
      current_time: new Date().toISOString(),
    },
  };

  const { allowed } = await openfgaClient.check(
    process.env.FGA_STORE_ID,
    request
  );
  return !!allowed;
}
```

Does it need a lot of explanation? The OpenFGA version is objectively cleaner, more maintainable, and scales better as your authorization logic grows.

### ✅ Checkpoint: Can You Answer These?

Before moving on, make sure you can answer:

1. What's the difference between a user and an object?
2. How do relations differ from roles?
3. When would you use indirect relationships?

{% collapsible **Answers** %}

1. **User vs Object**: A user is an entity (like a person), while an object is an instance of a type (like a specific cat or cat sitting arrangement). Users interact with objects through relations.
2. **Relations vs Roles**: Relations define how entities connect (like "owner of cat"), while roles are broader categories (like "admin" or "sitter") that can have multiple relations.
3. **Indirect Relationships**: Use these when you want to derive permissions from other relationships, like "can a sitter post updates if they are also the owner?" This allows for more flexible and dynamic permission checks.

{% endcollapsible %}

## <a id="openfga-in-action"></a> OpenFGA in Action [▓▓▓░░░░]

Let's test our model with real scenarios. We'll use the OpenFGA CLI to create a store, write the model, and run queries.

![But first, coffee](https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnZmZml2N25uZWI2bHAzaXdrdGprZzRpeTdtZnd3ZXRveDQ5MmR5ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2uIlaxs2XT8d1eR0Hw/giphy.gif)

### 1. Setting Up OpenFGA

First, create a store and write the authorization model:

```bash
# Create store
fga store create --name=purrfect-sitter
fga store get --store-id=01JMSR2BKF0F1PPGBTFEY5PGAZ
export FGA_STORE_ID=01JMSR2BKF0F1PPGBTFEY5PGAZ

# Create model
fga model write --file=purrfect-sitter-model.fga
export FGA_MODEL_ID=01JMSR3QA0WAFVS7PXDTW31JVZ
fga model get
```

### 2. Creating Basic Relationships

Now establish some relationships:

<!-- TODO: make long bash code block easier to read -->

```bash
# Bob owns Romeo (the cat)
fga tuple write user:bob owner cat:romeo

# Anne sits for Romeo (arrangement #1)
fga tuple write cat:romeo cat cat_sitting:1
fga tuple write user:anne sitter cat_sitting:1

# Can Bob manage Romeo's profile?
fga query check user:bob can_manage cat:romeo
# Yes (true)

# Can Anne manage someone else's cat?
fga query check user:anne can_manage cat:romeo
# No (false)
```

Bob owns Romeo, Anne sits for him. Simple.

### 3. Admin Powers

```bash
# Make Jenny a system admin
fga tuple write user:jenny admin system:development

# Add Romeo to the system
fga tuple write system:development system cat:romeo

# Can Jenny manage Romeo's profile?
fga query check user:jenny can_manage cat:romeo
# Yes (true)
```

Jenny becomes a system admin who can manage any cat—traditional RBAC within ReBAC.

### 4. Time Magic

```bash
# Make Anne active only during a specific time window
fga tuple write cat_sitting:1#sitter active_sitter cat_sitting:1 --condition-name is_active_timeslot \
--condition-context '{"start_time":"2023-01-01T00:00:00Z","end_time":"2023-01-02T00:00:00Z"}'

# Is Anne the sitter?
fga query check user:anne sitter cat_sitting:1
# Yes (true)

# Is Anne currently active (during her scheduled time)?
fga query check user:anne active_sitter cat_sitting:1 --context='{"current_time":"2023-01-01T00:09:50Z"}'
# Yes (true)

# Can Anne post updates during her active time?
fga query check user:anne can_post_updates cat_sitting:1 --context='{"current_time":"2023-01-01T12:00:00Z"}'
# Yes (true)

# Is Anne active after her scheduled time?
fga query check user:anne active_sitter cat_sitting:1 --context='{"current_time":"2023-01-03T00:09:50Z"}'
# No (false)

# Find all arrangements where Anne is active
fga query list-objects user:anne active_sitter cat_sitting --context='{"current_time":"2023-01-01T00:09:50Z"}'
# ["cat_sitting:1"]

# Find all arrangements where Bob is owner
fga query list-objects user:bob owner cat_sitting
# ["cat_sitting:1"]
```

Anne's permissions activate and deactivate automatically based on time. No cron jobs, no cleanup code—the authorization system handles it.

### 5. Status-Driven Access

```bash
# Set up review permission based on status
fga tuple write cat:romeo#owner can_review cat_sitting:1 --condition-name is_cat_sitting_completed \
--condition-context '{"completed_statuses":["completed"]}'

# Can Bob review while sitting is pending?
fga query check user:bob can_review cat_sitting:1 --context='{"cat_sitting_attributes":{"status": "pending"}}'
# No (false)

# Can Bob review when sitting is completed?
fga query check user:bob can_review cat_sitting:1 --context='{"cat_sitting_attributes":{"status": "completed"}}'
# Yes (true)
```

Reviews only make sense after sitting ends. OpenFGA enforces this business rule automatically.

### 6. Creating and Checking Review Permissions

Create a review and check permissions:

```bash
# Create review
fga tuple write cat_sitting:1 cat_sitting review:1

# Make review public
fga tuple write user:* can_view review:1

# Add review to system
fga tuple write system:development system review:1

# Can Bob (cat owner) edit the review?
fga query check user:bob can_edit review:1
# Yes (true)

# Can Jenny (admin) delete the review?
fga query check user:jenny can_delete review:1
# Yes (true)

# Can Anne (sitter) delete the review?
fga query check user:anne can_delete review:1
# No (false)

# List all reviews Bob authored
fga query list-objects user:bob author review
# ["review:1"]
```

### 7. Making the Review Public

Control visibility:

```bash
# Make review public
fga tuple write user:* can_view review:1

# Is the review visible to Edouard?
fga query check user:edouard can_view review:1
# Yes (true)
```

<!-- TODO: mention SDK for multiple languages and show examples in the app with Node.js SDK? -->

## <a id="testing-permissions-with-openfga-cli"></a> Testing permissions with OpenFGA CLI [▓▓▓▓░░░]

One of OpenFGA's strengths is its built-in testing capabilities. The CLI provides a declarative way to test authorization models without writing application code.

<!-- ##### Who Can Do What - Permission Example

![Diagram showing user permissions](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/1zvl0uoy2tdp4fs6p7sw.png) -->

### Declarative Testing with YAML

Define tests in YAML and run with a single command:

```bash
fga model test --tests store.fga.yml

# Or with Docker:
docker pull openfga/cli
docker run -it openfga/cli model test --tests store.fga.yml
```

...and forget about all the commands above. The `store.fga.yml` file contains everything you need to create the model and tuples, and run the tests before writing application code!

![Thank goodness](https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbHFwcjE1b3NvNGtqYWcwMGRoNHhmbnFmNzRncHo4ZXdyOWdmcmE5cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Xir88f7Y54j08KBWUQ/giphy.gif)

### Testing the PurrfectSitter Model

The OpenFGA CLI also comes with a testing feature. By defining tests in a YAML file, you can validate your model against expected behaviors.

Let's look at the `store.fga.yml` file that tests our PurrfectSitter model:

#### The authorization model

This is the model we defined earlier, but in YAML format for the OpenFGA CLI:

```yaml
model: |
  model
    schema 1.1

  # Our full model definition goes here...
```

> The [model](#the-complete-authorization-model) section is the same as the one we defined earlier, but in YAML format for the OpenFGA CLI.

#### The tuples

This section defines the relationships (tuples) in our model. Each tuple represents a relationship between a user and an object, along with the relation type.

```yaml
model:
  # ...
tuples:
  - user: user:jenny
    relation: admin
    object: system:development

  - user: user:bob
    relation: owner
    object: cat:romeo

  - user: system:development
    relation: system
    object: cat:romeo

  - user: cat:romeo
    relation: cat
    object: cat_sitting:1

  - user: user:anne
    relation: sitter
    object: cat_sitting:1

  - user: cat_sitting:1#sitter
    relation: active_sitter
    object: cat_sitting:1
    condition:
      name: is_active_timeslot
      context:
        start_time: '2023-01-01T00:00:00Z'
        end_time: '2023-01-02T00:00:00Z'

  - user: cat:romeo#owner
    relation: can_review
    object: cat_sitting:1
    condition:
      name: is_cat_sitting_completed
      context:
        completed_statuses: ['completed']

  - user: system:development
    relation: system
    object: review:1

  - user: cat_sitting:1
    relation: cat_sitting
    object: review:1

  - user: user:*
    relation: can_view
    object: review:1
```

#### The tests

This section defines the tests that will be run against the model and tuples. Each test checks specific permissions or relationships.

The example demonstrates several test types:

1. **Basic permission checks**: Simple assertions about relationships
2. **Contextual checks**: Testing time-based permissions
3. **Attribute-based checks**: Testing permissions depending on object attributes
4. **List objects**: Finding objects a user has relationships with
5. **List users**: Finding users with relationships to an object

```yaml
model:
  # ...
tuples:
  # ...
tests:
  - name: Test basic relations
    check:
      - user: user:anne
        object: cat_sitting:1
        assertions:
          sitter: true

      - user: user:bob
        object: cat_sitting:1
        assertions:
          owner: true

  - name: Test role access
    check:
      - user: user:jenny
        object: cat:romeo
        assertions:
          can_manage: true

      - user: user:bob
        object: cat:romeo
        assertions:
          can_manage: true

      - user: user:anne
        object: cat:romeo
        assertions:
          can_manage: false

  - name: Test temporal access
    check:
      - user: user:anne
        object: cat_sitting:1
        context:
          current_time: '2023-01-01T00:10:00Z'
        assertions:
          active_sitter: true

      - user: user:anne
        object: cat_sitting:1
        context:
          current_time: '2023-01-04T00:00:00Z'
        assertions:
          active_sitter: false

  - name: Test attribute access
    check:
      - user: user:bob
        object: cat_sitting:1
        context:
          cat_sitting_attributes:
            status: 'completed'
        assertions:
          can_review: true

      - user: user:bob
        object: cat_sitting:1
        context:
          cat_sitting_attributes:
            status: 'in_progress'
        assertions:
          can_review: false

  - name: Test the cat sitting that anne is sitting
    list_objects:
      - user: user:anne
        type: cat_sitting
        context:
          current_time: '2023-01-01T00:00:01Z'
        assertions:
          active_sitter:
            - cat_sitting:1
          sitter:
            - cat_sitting:1

  - name: Test the review that bob can edit
    list_objects:
      - user: user:bob
        type: review
        assertions:
          can_edit:
            - review:1

  - name: Test that reviews are public
    list_users:
      - object: review:1
        user_filter:
          - type: user
        assertions:
          can_view:
            users:
              - user:*
```

> You can find `store.fga.yml` in the [demo repository](https://github.com/getlarge/purrfect-sitter/blob/main/store.fga.yml).

#### Expected Output

```sh
# Test Summary #
Tests 7/7 passing
Checks 14/14 passing
ListObjects 3/3 passing
ListUsers 1/1 passing
```

### Testing During Adoption

These testing capabilities help when adopting OpenFGA:

- Validate models against business rules
- Verify permissions match the old system during migration
- Compare results with your existing system in shadow mode
- Prevent regressions with CI pipeline tests

Including tests in your workflow reduces authorization errors and builds confidence in your implementation.

## <a id="adoption-challenges-and-strategies"></a> Adoption Challenges and Strategies [▓▓▓▓▓▓░]

Of course, adopting OpenFGA in existing systems presents challenges. Here's how to address them:

### Mental Model Shift

ReBAC requires a paradigm shift for developers:

- **Mental model adjustment**: Developers familiar with RBAC or ABAC need time to think in relationships.
- **Training investment**: Workshops and examples help teams translate existing rules into relationship models.

### Data Synchronization

This is probably the most challenging aspect of adopting OpenFGA, especially if you have an existing database with complex permissions.

- **Dual writes**: Applications must write to both their database and OpenFGA.
- **Synchronization strategies**:
  - Event-driven synchronization through message queues
  - Centralized hooks for database operations
  - Transactional outbox pattern for consistency
  - Background jobs for existing data

> Note: Read this excellent article about dual writes in distributed systems [here](https://auth0.com/blog/handling-the-dual-write-problem-in-distributed-systems/). It will surely help you understand strategies for synchronizing data between your application(s) and OpenFGA.

### Progressive Adoption

Introduce OpenFGA incrementally:

#### 1. Start with Coarse-Grained Permissions

Begin with your existing structure:

- Replicate your current RBAC model
- Add organization-level permissions
- Gradually introduce finer-grained controls

#### 2. Shadow Mode Implementation

Before switching fully:

- Run existing authorization alongside OpenFGA
- Compare results to identify discrepancies
- Build confidence before making the switch

#### 3. Use Contextual Tuples for Hybrid Implementations

Reduce synchronization burden:

- Send data as contextual tuples initially
- Gradually move to persistent relationship tuples
- Use contextual tuples for frequently changing data

> Read more about this technique in the [OpenFGA documentation](https://openfga.dev/docs/best-practices/adoption-patterns#provide-request-level-data).

### Managing Organizational Adoption

For large organizations:

- Start with a single application where OpenFGA delivers immediate value
- Use modular models for independent team control
- Leverage access control for team-specific credentials

<!-- Other production advice https://openfga.dev/docs/best-practices/running-in-production -->

<!-- TODO: For senior architects: Deep-dive into performance characteristics,monitoring, mention support for OpenTelemetry - https://openfga.dev/docs/getting-started/configure-telemetry, horizontal scaling strategies, and production deployment patterns. Include ROI calculations and architectural trade-offs. -->

## <a id="your-next-move"></a> Your Next Move [▓▓▓▓▓▓▓]

Authorization doesn't have to be the part of your codebase that makes you cry. ReBAC and OpenFGA offer a cleaner path—one that grows with your app instead of strangling it.

Start with PurrfectSitter's model, draw inspiration from the application in [github.com/getlarge/purrfect-sitter](https://github.com/getlarge/purrfect-sitter), adapt it to your domain, and watch complex permission logic become simple relationship definitions.

> _If you want to show your appreciation, give it a_ ⭐️

{% github getlarge/purrfect-sitter %}

Your future self will thank you for choosing relationships over nested IF statements.

{% user getlarge %}

<!-- References -->
<!-- Zanzibar Academy https://zanzibar.academy -->
