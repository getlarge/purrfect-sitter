# Who Let the Cats Out?: Solving the Authorization Mystery with ReBAC

## Talk Information

- **Title:** Who Let the Cats Out?: Solving the Authorization Mystery with ReBAC
- **Duration:** 25-30 minutes
- **Conference:** HalfStack (September 2025)
- **Keywords:** security, authorization, node.js

## Abstract

Remember when you had to write a 200-line SQL query just to check if someone could view a button? We've all been there. But what if managing API permissions could be as natural as explaining who can feed your cat while you're away? This session will explore Relation-Based Access Control (ReBAC) through a real-world cat-sitting application. You'll see how OpenFGA transforms complex authorization scenarios into intuitive relationship rules—no more tangled permission checks or security nightmares. Perfect for developers tired of wrestling with traditional permission systems and ready for a more elegant solution. By the end, you'll have everything you need to implement ReBAC in your applications—and your cats will approve!

## Talk Structure (25 minutes)

1. **Opening Hook** (2 min): Authorization Detective Game
2. **OWASP Vulnerabilities** (5 min): Conference/cat metaphors with audience participation
3. **Live Exploits** (5 min): Interactive breaking of PurrfectSitter
4. **Authorization Horror** (5 min): The evolution from 3 to 127 lines
5. **ReBAC Transition** (3 min): Mental model shift with relationship translation
6. **PurrfectSitter Demo** (5 min): OpenFGA magic with audience choices

## OWASP API Security Top 10 - Conference & Cat Edition

### API1:2023 - Broken Object Level Authorization

**"Taking Someone Else's Stuff"**

**Conference example:**

- You're a speaker ✓, that's your role
- But that doesn't mean you can take MY backpack
- Just because you can access `/api/backpacks/` doesn't mean you can access `/api/backpacks/edouards-awesome-bag`

**Cat example:**

```javascript
// Vulnerable: Only checks if user is a sitter, not if they're sitting THIS cat
GET /api/cats/romeo/health-updates
Authorization: Bearer <anne-token>
// Anne is a sitter, but is she Romeo's sitter?
```

### API5:2023 - Broken Function Level Authorization

**"Wrong Time Slot, Wrong Stage"**

**Conference example:**

- You're a speaker ✓ (correct role)
- But it's NOT your time slot ✗ (wrong context)
- "Hey, I'm also a speaker!" _waves hand from audience_
- Audience member: "Wait, two speakers?"

**Cat example:**

```javascript
// Anne tries to post updates at 3 AM when her sitting ended at 6 PM
POST /api/sittings/123/updates
Authorization: Bearer <anne-token>
// Is Anne an ACTIVE sitter right now?
```

### API3:2023 - Broken Object Property Level Authorization

**"Seeing Too Much Info"**

**Conference example:**

- You can see the speaker schedule ✓
- But you shouldn't see speaker phone numbers ✗
- Or their hotel room numbers ✗✗

**Cat example:**

```javascript
// User gets cat info but shouldn't see owner's home address
{
  "catId": "romeo",
  "name": "Romeo",
  "breed": "Maine Coon",
  "ownerAddress": "123 Secret St", // ❌ Shouldn't be here
  "ownerPhoneNumber": "+1234567890" // ❌ Neither should this
}
```

### API6:2023 - Unrestricted Access to Sensitive Business Flows

**"Gaming the System"**

**Conference example:**

- Submitting 500 talk proposals to flood the system
- Using bots to grab all the good speaking slots
- Registering fake attendees to get free swag

**Cat example:**

```javascript
// Creating 100 fake sitting requests to block out competitors
for(let i = 0; i < 100; i++) {
  POST /api/sitting-requests
  {
    "catId": "popular-expensive-cat",
    "dates": ["2025-12-24", "2025-12-25"] // Christmas dates
  }
}
```

### API2:2023 - Broken Authentication

**"Identity Crisis"**

**Conference example:**

- "I'm definitely the keynote speaker"
- _Shows business card from Kinko's_
- No proper verification of speaker credentials

**Cat example:**

```javascript
// Weak JWT tokens that can be easily forged
{
  "userId": "anne",
  "role": "sitter",
  "exp": 9999999999 // Expires in year 2286
}
```

## Live Exploitation Demos (HalfStack Interactive Format)

### Demo 1: "The Curious Case of the Wrong Cat Owner"

**API1: Broken Object Level Authorization**

**Setup:** Show PurrfectSitter app with two users: Bob (owns Romeo) and Anne (sitter)

**Vulnerable code:**

```javascript
// GET /api/cats/:catId
app.get('/api/cats/:catId', authenticateUser, async (req, res) => {
  const { catId } = req.params;
  // ❌ Only checks if user is authenticated, not if they own this cat
  const cat = await db.cats.findById(catId);
  res.json(cat);
});
```

**Live exploit:**

1. Show Bob accessing `/api/cats/romeo` ✅ (his cat)
2. Show Anne accessing `/api/cats/romeo` ✅ (should fail but doesn't)
3. **Audience participation:** "What other cat IDs should we try?"
4. Try `/api/cats/princess`, `/api/cats/whiskers` - all exposed!

**Impact:** Anne can see all cats' private data, addresses, owner info

---

### Demo 2: "The Time Traveling Sitter"

**API5: Broken Function Level Authorization**

**Vulnerable code:**

```javascript
// POST /api/sittings/:id/updates
app.post('/api/sittings/:id/updates', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const sitting = await db.sittings.findById(req.params.id);

  // ❌ Only checks if user is the assigned sitter, ignores time windows
  if (sitting.sitterId === userId) {
    await db.updates.create({ sittingId: sitting.id, ...req.body });
    res.json({ success: true });
  }
});
```

**Live exploit:**

1. Show Anne's sitting from 9 AM - 5 PM (already ended)
2. Current time: 11 PM
3. Anne posts update: "Just fed Romeo!" at 11 PM
4. **Interactive element:** Ask audience "What time should Anne post from?" - try ridiculous times
5. All updates succeed regardless of time

**Impact:** Fake activity logs, billing fraud, confused cat owners

---

### Demo 3: "The Data Leak Buffet"

**API3: Broken Object Property Level Authorization**

**Vulnerable API response:**

```javascript
// GET /api/my-sittings (as Anne)
{
  "sittings": [{
    "id": "123",
    "catName": "Romeo",
    "status": "active",
    "ownerName": "Bob",
    "ownerPhone": "+1-555-SECRET", // ❌ Shouldn't be here
    "ownerAddress": "123 Private St", // ❌ PII leak
    "emergencyContact": "Bob's Mom", // ❌ More PII
    "veterinaryRecords": [...], // ❌ Medical data
    "homeSecurityCode": "1234" // ❌ Security risk!
  }]
}
```

**Live demonstration:**

1. Log in as Anne (sitter)
2. Show what she should see vs. what she actually sees
3. **Audience challenge:** "What's the worst field you can imagine being leaked here?"
4. Reveal progressively worse data exposure

---

### Demo 4: "The Sitting Request Swarm Attack"

**API6: Unrestricted Business Flow Access**

**Vulnerable endpoint:**

```javascript
// POST /api/sitting-requests
app.post('/api/sitting-requests', authenticateUser, async (req, res) => {
  // ❌ No rate limiting, no business logic validation
  const request = await db.sittingRequests.create({
    userId: req.user.id,
    ...req.body,
  });
  res.json(request);
});
```

**Live exploit script:**

```javascript
// The "Christmas Cat Heist"
const christmasAttack = async () => {
  const promises = [];
  for (let i = 0; i < 50; i++) {
    promises.push(
      fetch('/api/sitting-requests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${anneToken}` },
        body: JSON.stringify({
          catId: 'popular-expensive-persian-cat',
          startDate: '2025-12-24',
          endDate: '2025-12-26',
          note: `Request ${i} - blocking competitors!`,
        }),
      })
    );
  }
  await Promise.all(promises);
  console.log('🎄 Christmas cats monopolized! 🎄');
};
```

**Interactive execution:**

1. Show normal sitting request flow
2. Run the swarm attack live
3. **Audience watches** request count climb in real-time
4. Show how legitimate users can't request Christmas sittings
5. **Reveal:** This actually happened to a pet sitting startup in 2023!

**Transition line:** _"So... how do we fix this authorization nightmare without writing 500-line permission functions?"_

## Authorization Code Horror Examples

### "The Evolution of a Simple Check"

**Version 1:** _Simple times (Day 1)_

```javascript
function canUpdateCat(userId, catId) {
  const cat = await db.cats.findById(catId);
  return cat.ownerId === userId;
}
```

_"Easy! Just check if they own the cat."_

---

**Version 2:** _Add admin access (Day 30)_

```javascript
function canUpdateCat(userId, catId) {
  const user = await db.users.findById(userId);
  const cat = await db.cats.findById(catId);

  return cat.ownerId === userId || user.role === 'admin';
}
```

_"OK, admins can update any cat. Still manageable."_

---

**Version 3:** _Add sitter permissions (Day 60)_

```javascript
function canUpdateCat(userId, catId) {
  const user = await db.users.findById(userId);
  const cat = await db.cats.findById(catId);
  const activeSitting = await db.sittings.findOne({
    catId,
    sitterId: userId,
    status: 'active',
    startTime: { $lte: new Date() },
    endTime: { $gte: new Date() }
  });

  return cat.ownerId === userId ||
         user.role === 'admin' ||
         !!activeSitting;
}
```

_"Sitters can update cats during active sittings. Getting a bit complex..."_

---

**Version 4:** _Add organization permissions (Day 120)_

```javascript
async function canUpdateCat(userId, catId) {
  const user = await db.users.findById(userId);
  const cat = await db.cats.findById(catId);

  // Check direct ownership
  if (cat.ownerId === userId) return true;

  // Check admin role
  if (user.role === 'admin') return true;

  // Check active sitting
  const activeSitting = await db.sittings.findOne({
    catId,
    sitterId: userId,
    status: 'active',
    startTime: { $lte: new Date() },
    endTime: { $gte: new Date() },
  });
  if (activeSitting) return true;

  // Check organization membership
  const catOwner = await db.users.findById(cat.ownerId);
  if (catOwner.organizationId) {
    const userOrg = await db.organizationMembers.findOne({
      organizationId: catOwner.organizationId,
      userId: userId,
      role: { $in: ['manager', 'admin'] },
    });
    if (userOrg) return true;
  }

  return false;
}
```

_"Organization managers can update member cats. This is getting unwieldy..."_

---

**Version 5:** _Add emergency contacts (Day 180)_

```javascript
async function canUpdateCat(userId, catId) {
  const user = await db.users.findById(userId);
  const cat = await db.cats.findById(catId);

  // Check direct ownership
  if (cat.ownerId === userId) return true;

  // Check admin role
  if (user.role === 'admin') return true;

  // Check active sitting
  const activeSitting = await db.sittings.findOne({
    catId,
    sitterId: userId,
    status: 'active',
    startTime: { $lte: new Date() },
    endTime: { $gte: new Date() },
  });
  if (activeSitting) return true;

  // Check organization membership
  const catOwner = await db.users.findById(cat.ownerId);
  if (catOwner.organizationId) {
    const userOrg = await db.organizationMembers.findOne({
      organizationId: catOwner.organizationId,
      userId: userId,
      role: { $in: ['manager', 'admin'] },
    });
    if (userOrg) return true;
  }

  // Check emergency contact permissions (new requirement!)
  const emergencyContact = await db.emergencyContacts.findOne({
    catId,
    contactUserId: userId,
    isActive: true,
  });
  if (emergencyContact) {
    // But only during emergencies or if owner is unreachable
    const ownerLastSeen = await db.userActivity.findOne({
      userId: cat.ownerId,
    });
    const hoursOffline =
      (Date.now() - ownerLastSeen.lastActiveAt) / (1000 * 60 * 60);
    if (hoursOffline > 24) return true;

    // Or if there's an active emergency
    const activeEmergency = await db.emergencies.findOne({
      catId,
      status: 'active',
    });
    if (activeEmergency) return true;
  }

  return false;
}
```

_"Emergency contacts can update cats if owners are offline >24h OR there's an active emergency. Send help."_

---

**Version 6:** _Add delegated permissions (Day 240)_

```javascript
async function canUpdateCat(userId, catId) {
  // ... (previous 50 lines of logic)

  // Check delegated permissions (newest requirement!)
  const delegation = await db.delegatedPermissions.findOne({
    granterUserId: cat.ownerId,
    granteeUserId: userId,
    permission: 'update_cat',
    catId: catId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });

  if (delegation) {
    // But check delegation conditions
    if (delegation.conditions) {
      for (const condition of delegation.conditions) {
        switch (condition.type) {
          case 'time_window':
            const now = new Date();
            const currentTime = now.getHours() * 100 + now.getMinutes();
            if (
              currentTime < condition.startTime ||
              currentTime > condition.endTime
            ) {
              continue; // This delegation doesn't apply now
            }
            break;
          case 'location_based':
            const userLocation = await getUserLocation(userId);
            const distance = calculateDistance(
              userLocation,
              condition.location
            );
            if (distance > condition.maxDistance) {
              continue; // User too far away
            }
            break;
          case 'approval_required':
            const pendingApproval = await db.approvals.findOne({
              delegationId: delegation.id,
              status: 'pending',
            });
            if (pendingApproval) {
              continue; // Still needs approval
            }
            break;
        }
      }
      return true; // All conditions met
    }
    return true; // No conditions to check
  }

  return false;
}
```

**The Reveal:**
_"This function is now 127 lines long, hits 8 different database tables, and has 47 different code paths. Good luck debugging this at 3 AM when someone can't feed Mr. Whiskers."_

**The Punchline:**
_"And we haven't even added audit logging, caching, or error handling yet. Also, we just got a new requirement: temporary vet access during medical emergencies. Who wants to add another 30 lines?"_

## ReBAC Transition Narrative

### "There Has To Be A Better Way!"

**The Recognition Moment:**
_"Looking at that authorization function, what do you notice? We're not really checking permissions—we're checking RELATIONSHIPS."_

- Bob owns Romeo → **ownership relationship**
- Anne sits for Romeo from 9-5 → **temporary relationship with time context**
- Jenny is a system admin → **role relationship**
- Bob's organization manages the cat → **hierarchical relationship**
- Emergency contact when owner offline → **conditional relationship**

---

### "What If We Could Express This Naturally?"

**The Mental Model Shift:**

Instead of asking:

> _"Can user X perform action Y on resource Z given conditions A, B, C?"_

Ask:

> _"What is user X's relationship to resource Z right now?"_

**Traditional thinking:**

```
IF (user.id === cat.ownerId)
OR (user.role === 'admin')
OR (activeSitting AND currentTime BETWEEN sitting.start AND sitting.end)
OR (emergencyContact AND owner.offline > 24h)
OR (delegatedPermission AND delegation.valid)
THEN allow
```

**Relationship thinking:**

```
user:bob → owner → cat:romeo
user:anne → active_sitter → cat_sitting:1 → cat:romeo
user:jenny → admin → system → cat:romeo
user:emergency_vet → emergency_contact → cat:romeo (when owner offline)
```

---

### "The Relationship Revelation"

**Why relationships work better:**

1. **Natural Language Mapping**

   - "Bob owns Romeo" ✅
   - "Anne is actively sitting Romeo" ✅
   - "Jenny administers the system managing Romeo" ✅
   - vs. "If user ID equals cat owner ID or..." 🤮

2. **Composable Logic**

   - Relationships can be combined, inherited, and contextual
   - No more nested IF statements
   - Each rule is independent and testable

3. **Dynamic Resolution**
   - Time-based relationships activate/deactivate automatically
   - No cron jobs to grant/revoke permissions
   - Context drives authorization naturally

---

### "The Bridge to ReBAC"

**"What if I told you..."**

_"...that the 127-line authorization function could become this:"_

```yaml
type cat
  relations
    define owner: [user]
    define admin: admin from system
    define active_sitter: [cat_sitting#sitter with is_active_timeslot]
    define emergency_contact: [user with is_emergency_active]
    define delegated_manager: [user with has_valid_delegation]
    define can_update: owner or admin or active_sitter or emergency_contact or delegated_manager
```

_"And the permission check becomes:"_

```javascript
const canUpdate = await fga.check({
  user: `user:${userId}`,
  relation: 'can_update',
  object: `cat:${catId}`,
  context: { current_time: new Date().toISOString() },
});
```

**The Audience Challenge:**
_"Raise your hand if you'd rather debug 6 lines of relationship definitions than 127 lines of conditional logic at 3 AM."_

---

### "But Wait, There's More!"

**ReBAC gives you:**

- **Queries, not just checks:** "What cats can Anne update?" "Who can feed Romeo?"
- **Audit trails:** Full relationship history and changes
- **Performance:** Google-scale authorization (Zanzibar handles billions of checks/day)
- **Flexibility:** Add new relationship types without changing code
- **Testing:** Declarative tests for complex permission scenarios

**The Setup:**
_"Let me show you this in action with our PurrfectSitter app. We'll see how those complex authorization scenarios become simple relationship definitions, and how OpenFGA makes this magic happen."_

**[Transition to Demo]**

## PurrfectSitter Demo Scenarios (The ReBAC Solution)

### Demo Setup: "The Clean Slate"

_"Let's rebuild our authorization system the right way."_

**Show the OpenFGA model:**

```yaml
type cat
  relations
    define owner: [user]
    define admin: admin from system
    define active_sitter: [cat_sitting#sitter with is_active_timeslot]
    define can_manage: owner or admin or active_sitter
```

---

### Scenario 1: "Fixing the Wrong Cat Owner"

**Solving API1: Broken Object Level Authorization**

**The ReBAC way:**

```javascript
// Before: 127-line function with 8 database calls
// After: One OpenFGA check
app.get('/api/cats/:catId', authenticateUser, async (req, res) => {
  const canView = await fga.check({
    user: `user:${req.user.id}`,
    relation: 'can_manage',
    object: `cat:${req.params.catId}`,
  });

  if (!canView.allowed) {
    return res.status(403).json({ error: 'Not your cat!' });
  }

  const cat = await db.cats.findById(req.params.catId);
  res.json(cat);
});
```

**Live demo:**

1. Bob tries `/api/cats/romeo` → ✅ (he's the owner)
2. Anne tries `/api/cats/romeo` → ❌ (not authorized)
3. Anne tries `/api/cats/whiskers` → ❌ (not authorized)
4. **Audience interaction:** "What should happen when Anne becomes Romeo's sitter?"

---

### Scenario 2: "Time Magic - No More Cron Jobs"

**Solving API5: Broken Function Level Authorization**

**Set up the sitting relationship:**

```bash
# Anne becomes Romeo's active sitter
fga tuple write user:anne sitter cat_sitting:1
fga tuple write cat:romeo cat cat_sitting:1
fga tuple write cat_sitting:1#sitter active_sitter cat_sitting:1 \
  --condition-name is_active_timeslot \
  --condition-context '{"start_time":"2025-09-01T09:00:00Z","end_time":"2025-09-01T17:00:00Z"}'
```

**The time-aware API:**

```javascript
app.post('/api/cats/:catId/updates', authenticateUser, async (req, res) => {
  const canUpdate = await fga.check({
    user: `user:${req.user.id}`,
    relation: 'can_manage',
    object: `cat:${req.params.catId}`,
    context: { current_time: new Date().toISOString() },
  });

  if (!canUpdate.allowed) {
    return res.status(403).json({ error: 'Not authorized at this time' });
  }

  // Create update...
});
```

**Interactive time travel:**

1. **9:30 AM:** Anne posts update → ✅ "Fed Romeo his breakfast"
2. **2:00 PM:** Anne posts update → ✅ "Romeo is napping in the sun"
3. **6:00 PM:** Anne posts update → ❌ "Sitting ended at 5 PM"
4. **Audience participation:** "What time should we test next?"

---

### Scenario 3: "The Query Revolution"

**Beyond Simple Checks - ReBAC's Superpower**

**Traditional approach:**
_"To find Anne's active cats, we'd need complex SQL with joins across 4 tables..."_

**ReBAC approach:**

```javascript
// What cats can Anne manage right now?
const annesCats = await fga.listObjects({
  user: 'user:anne',
  relation: 'can_manage',
  type: 'cat',
  context: { current_time: new Date().toISOString() },
});
// Returns: ["cat:romeo"] (only during sitting time)
```

**Interactive dashboard demo:**

1. Show Anne's dashboard at 2 PM → Shows Romeo ✅
2. Show Anne's dashboard at 6 PM → Shows nothing ❌
3. Show Bob's dashboard anytime → Shows Romeo ✅ (he's the owner)
4. **Audience challenge:** "What should Jenny the admin see?"

---

### Scenario 4: "The Delegation Demo"

**Complex Business Logic Made Simple**

**New requirement:** _"Owners should be able to temporarily delegate cat management to trusted friends."_

**Traditional approach:** _"Time to add another 30 lines to our authorization function..."_

**ReBAC approach:** _"Let's add one relationship type:"_

```yaml
type cat
  relations
    define delegated_manager: [user with valid_delegation]
    define can_manage: owner or admin or active_sitter or delegated_manager
```

**Live delegation:**

```bash
# Bob delegates Romeo management to his friend Charlie for the weekend
fga tuple write user:charlie delegated_manager cat:romeo \
  --condition-name valid_delegation \
  --condition-context '{"start_time":"2025-09-07T00:00:00Z","end_time":"2025-09-08T23:59:59Z","delegated_by":"user:bob"}'
```

**Show the magic:**

1. Charlie tries to update Romeo on Friday → ❌ (delegation not started)
2. Charlie tries to update Romeo on Saturday → ✅ (delegation active)
3. Charlie tries to update Romeo on Monday → ❌ (delegation expired)
4. **No code changes needed!** The same API automatically respects the new relationship.

---

### Scenario 5: "The Audit Trail Bonus"

**Compliance and Debugging Made Easy**

**Traditional approach:** _"Let me grep through application logs..."_

**ReBAC approach:**

```javascript
// Who had access to Romeo on September 1st?
const romeoAccess = await fga.listUsers({
  object: 'cat:romeo',
  relation: 'can_manage',
  user_filter: [{ type: 'user' }],
  context: { current_time: '2025-09-01T14:00:00Z' },
});
// Returns: [{ user: 'user:bob' }, { user: 'user:anne' }, { user: 'user:jenny' }]
```

**Interactive audit:**

1. Show access history for Romeo over time
2. Query who can access what at different timestamps
3. **Audience realization:** "This is better than database logs!"

---

### The Grand Finale: "What We Just Accomplished"

**Problems solved:**

- ✅ Object-level authorization (only authorized users see cats)
- ✅ Function-level authorization (time-aware permissions)
- ✅ Complex business logic (delegation, emergency access)
- ✅ Audit trails (who had access when)
- ✅ Performance (single API call vs. 8 database queries)
- ✅ Maintainability (6 lines of model vs. 127 lines of code)

**The mic drop moment:**
_"The same OpenFGA model that handles Bob's simple cat ownership also handles Anne's time-based sitting, Jenny's admin access, Charlie's weekend delegation, and emergency vet access during owner absence. No code changes. No database migrations. No 3 AM debugging sessions."_

**Audience challenge:**
_"Who wants to add a new requirement? Veterinarian access during medical emergencies?"_

_[Show how to add new relationship type and watch it work immediately]_

---

### The Ultimate Challenge: "AI Agent Showdown"

**Setup:** _"I have one more challenge for you. Let's test if ReBAC is really better by having AI agents implement a new requirement."_

**The Scenario:**
> *"Emergency contacts should only access cats when the owner has been offline for more than 24 hours AND it's outside normal business hours (9 AM - 6 PM)."*

**The Challenge:**
- **Agent A:** Works with OpenFGA DSL
- **Agent B:** Works with traditional authorization code (127 lines)
- **Live audience:** Votes on which implementation they trust more

**What This Demonstrates:**

1. **DSL Clarity:** OpenFGA's domain-specific language maps directly to natural language requirements
2. **AI Comprehension:** Structured relationships are easier for AI to parse than nested conditionals
3. **Implementation Speed:** Agent A likely finishes much faster
4. **Correctness:** Agent B more likely to miss edge cases in complex conditional logic
5. **Maintainability:** Future requirement changes favor the DSL approach

**Interactive Elements:**
- Audience suggests additional edge cases during the demo
- Real-time code generation by both agents
- "Spot the bug" moments in the traditional approach
- Time comparison between implementations

**The Payoff:**
_"ReBAC isn't just better for humans—it's better for AI-assisted development too. In our AI-augmented future, authorization logic needs to be predictable and maintainable. Which approach would you rather hand off to your AI coding assistant?"_

## Interactive Audience Elements (HalfStack Style)

### Opening Hook: "The Authorization Detective Game"

**Duration:** 2 minutes

**Setup:** Show a slide with Bob, Anne, Romeo (cat), and Jenny (admin)
_"Before we dive into vulnerabilities, let's play detective. I'll show you a permission request, you tell me if it should be allowed."_

**Interactive scenarios:**

1. **👋 Raise hands:** "Bob wants to update Romeo's profile at 2 PM" → _Everyone raises hands_
2. **👋 Keep hands up:** "Anne wants to update Romeo's profile at 2 PM" → _Some hands stay up_
3. **🤔 Plot twist:** "Anne is Romeo's active sitter from 9 AM-5 PM today" → _More hands go up_
4. **💭 Audience shouts:** "What time should it be for Anne to lose access?" → _Get audience to shout times_

**Payoff:** _"Great! You just identified the core challenge of authorization: context matters. Let's see how badly we can break this..."_

---

### During OWASP Examples: "Vulnerability Bingo"

**Duration:** Throughout the first 5 minutes

**Setup:** Show QR code for simple web app (or ask people to mentally track)
_"I'll show you real API calls. Count how many different things are wrong with each one."_

**Interactive tracking:**

- **Silent counting:** Audience counts vulnerabilities mentally
- **Show of hands:** "How many found 3+ problems in that API?"
- **Audience callouts:** "What's the worst field you saw leaked?"
- **Group voting:** "Thumbs up if you've seen this exact bug in production"

---

### Live Exploitation: "The Audience Chooses the Attack"

**Duration:** 5 minutes

**Interactive elements:**

**1. ID Guessing Game:**

```javascript
// Show vulnerable endpoint: GET /api/cats/:catId
```

_"Anne just tried `/api/cats/romeo` and it worked. What other cat IDs should we try?"_

- **Audience shouts:** "princess!", "whiskers!", "1", "admin"
- **Live testing:** Try each suggestion and show results
- **Running tally:** Count exposed cats on screen

**2. Time Travel Challenge:**

```javascript
// Show vulnerable time-based endpoint
```

_"Anne's sitting ended at 5 PM. What ridiculous time should she try to post from?"_

- **Audience suggestions:** "3 AM!", "Next year!", "1999!"
- **Live demo:** Actually send requests with audience times
- **Dramatic reveals:** Show each request succeeding

**3. The Data Leak Lottery:**
_"What's the worst field you can imagine being accidentally exposed in a cat sitter API?"_

- **Audience brainstorm:** Get progressively worse suggestions
- **Reveal slide:** Show actual leaked fields matching their guesses
- **Winner recognition:** "Credit card numbers! We have a winner!"

---

### Authorization Horror: "Function Length Betting"

**Duration:** During the horror evolution section

**Interactive prediction:**

1. **Starting bet:** _"Version 1 was 3 lines. How many lines will version 6 be?"_

   - **Audience shouts numbers:** Write guesses on slide
   - **Closest wins:** Small prize (stickers, etc.)

2. **Progressive reveals:**

   - Show each version
   - **Audience groans:** Encourage audible reactions
   - **Line counting:** Make audience count with you
   - **"Add feature" voting:** Let audience vote on which terrible requirement to add next

3. **The final reveal:**
   - **Dramatic pause:** "The final version was..."
   - **Audience reaction:** Let them react to 127 lines
   - **Winner announcement:** Award the closest guesser

---

### ReBAC Transition: "Relationship Translation Game"

**Duration:** 3 minutes

**Interactive challenge:**
_"I'll show you gnarly authorization logic. You tell me the relationship it's really checking."_

**Example 1:**

```javascript
if (user.role === 'admin' || cat.ownerId === userId ||
    (activeSitting && currentTime > sitting.start && currentTime < sitting.end))
```

**Audience task:** _"Shout out the relationships!"_

- Listen for: "admin!", "owner!", "active sitter!"
- **Validate:** "Yes! Admin relationship, ownership relationship, temporary sitting relationship!"

**Example 2:**

```javascript
if (emergencyContact && owner.lastSeen > 24hours && emergency.active)
```

**Audience task:** _"What relationship is this checking?"_

- **Guide them:** "It's a conditional relationship..."
- **Reveal:** "Emergency contact relationship with context conditions!"

**Payoff:** _"You just translated imperative code into relationship thinking. That's the ReBAC mindset!"_

---

### Demo Scenarios: "Choose Your Own Adventure"

**Duration:** Throughout the 10-minute demo

**Interactive decision points:**

**1. Time Travel Voting:**
_"Anne's sitting is 9 AM to 5 PM. What time should we test her access?"_

- **Show options:** 8:30 AM, 2:00 PM, 6:00 PM, Midnight
- **Audience vote:** Raised hands for each option
- **Live demo:** Test the winner, then reveal what happens at other times

**2. Requirement Roulette:**
_"We need to add a new permission type. Which sounds most painful to implement the old way?"_

- **Options:** Emergency vet access, Weekend delegation, Organization hierarchy, Temporary fostering
- **Audience vote:** Loudest cheer wins
- **Live implementation:** Show how to add it to ReBAC model in real-time

**3. Query Challenge:**
_"What should we ask OpenFGA to find for us?"_

- **Audience suggestions:** "Who can feed Romeo?", "What cats can Anne access?", "When did Bob lose access?"
- **Live queries:** Run suggestions that make sense
- **Surprising results:** Show unexpected query capabilities

---

### Grand Finale: "The New Requirement Challenge"

**Duration:** Final 2 minutes

**Setup:** _"You've convinced me ReBAC is great. But surely it breaks when we add something totally new..."_

**Audience challenge:**

1. **Requirement brainstorm:** "What's a crazy authorization requirement we haven't covered?"

   - **Audience shouts:** Collect 3-4 suggestions
   - **Vote:** Pick the craziest one

2. **Live implementation:**

   - **Show model:** Add relationship definition in real-time
   - **Show code:** Demonstrate it works immediately
   - **Show queries:** Prove it integrates seamlessly

3. **Mic drop moment:**
   - **Comparison slide:** "Traditional approach: 47 new lines of code"
   - **ReBAC approach:** "One new relationship definition"
   - **Audience appreciation:** "Who's ready to never write nested authorization logic again?"

---

### Closing Interactive: "The Commitment Ceremony"

**Duration:** 1 minute

**Final audience participation:**
_"Raise your hand if you're going to try ReBAC in your next project!"_

- **Count hands:** Make it a celebration
- **Follow-up:** "Keep them up if you want the demo code repository!"
- **QR code:** Show link to PurrfectSitter repo
- **Community building:** "Find me after for ReBAC war stories!"

**Memorable closer:**
_"Your future self will thank you for choosing relationships over nested IF statements. Now go forth and let no more cats out!"_

## Visual Slides/Diagrams Concepts

### Opening Slide: "The Crime Scene"

**Style:** XKCD-style stick figures

```
[Stick figure with laptop] "I can access ANY cat profile!"
[Confused stick figure] "But... you're only supposed to sit Romeo?"
[Cat drawing] "Meow?" (speech bubble)
[Large arrow pointing to code] "GET /api/cats/any-cat-id-here"
```

**Caption:** "Authorization: Because 'trust me bro' isn't a security model"

---

### OWASP Vulnerability Series

**Style:** Warning signs with stick figures

**API1 - Broken Object Level Authorization:**

```
[Stick figure at podium labeled "AUTHORIZED SPEAKER"]
[Arrow pointing to another stick figure holding bag]
[Text bubble] "This is also my backpack!"
[Warning sign] "⚠️ Role ≠ Ownership"
```

**API5 - Broken Function Level Authorization:**

```
[Clock showing 11 PM]
[Stick figure waving] "I'm also a speaker!"
[Confused audience stick figures]
[Schedule board showing] "Speaker slot: 2 PM - 3 PM"
[Warning sign] "⚠️ Right role, wrong time"
```

---

### Authorization Horror Evolution Diagram

**Style:** Growing monster visualization

```
Version 1: [Small, cute code block - 3 lines]
Version 2: [Slightly bigger block with sprouting tentacles - 8 lines]
Version 3: [Medium monster with multiple eyes - 25 lines]
Version 4: [Large monster with spikes - 67 lines]
Version 5: [Huge monster crushing buildings - 95 lines]
Version 6: [Godzilla-sized monster destroying city - 127 lines]

[Stick figure running away screaming] "IT'S ALIVE!"
```

**Caption:** "How authorization functions evolve in the wild"

---

### The Mental Model Shift

**Style:** Before/After comparison

**Before (Traditional):**

```
[Flowchart with diamond decision boxes]
"Is user admin?" → "Does user own cat?" → "Is sitting active?" →
"Is time valid?" → "Is emergency?" → [Complex nested structure]
[Stick figure with confused expression] "Which path was I on again?"
```

**After (ReBAC):**

```
[Simple relationship diagram]
user:bob ──owns──→ cat:romeo
user:anne ──sits──→ cat_sitting:1 ──affects──→ cat:romeo
user:jenny ──admin──→ system ──manages──→ cat:romeo

[Happy stick figure] "Oh, it's just about relationships!"
```

---

### The Database Query Nightmare

**Style:** Dante's Inferno parody

```
[Multiple database icons connected by tangled lines]
DB1: users → DB2: cats → DB3: sittings → DB4: organizations →
DB5: emergency_contacts → DB6: delegations → DB7: approvals → DB8: conditions

[Stick figure developer at bottom surrounded by flame drawings]
"Abandon hope, all ye who enter here (the authorization function)"

[Performance counter] "8 DB queries, 247ms response time"
```

**vs. ReBAC:**

```
[Single OpenFGA icon]
[Happy stick figure] "One API call!"
[Performance counter] "1 query, 12ms response time"
```

---

### Relationship Graph Visualization

**Style:** Network diagram with cat theme

```
                    system:development
                           |
                    [admin relationship]
                           |
    user:jenny ─────────────────────────── user:bob
        |                                    |
    [admin]                              [owner]
        |                                    |
        └─────── cat:romeo ←─────────────────┘
                    |
            [cat relationship]
                    |
              cat_sitting:1
             /           \
    [sitter]/             \[active_sitter with time]
          /                 \
    user:anne ←──────────────┘

[Clock icon] "Time context: 9 AM - 5 PM"
```

**Caption:** "Relationships, not roles"

---

### The Time Magic Visualization

**Style:** Timeline with access indicators

```
Timeline: 8 AM ─── 9 AM ─── 2 PM ─── 5 PM ─── 6 PM ─── 8 PM

user:bob    [████████████████████████████████] (always owner)
user:anne   [      ████████████████      ] (sitting hours only)
user:jenny  [████████████████████████████████] (always admin)

[Stick figure Anne at 8:30 AM] "Access denied!" 😞
[Stick figure Anne at 2:00 PM] "Can update Romeo!" 😊
[Stick figure Anne at 6:00 PM] "Access denied!" 😞

[No cron jobs needed! - with celebration emoji]
```

---

### The Query Power Demonstration

**Style:** Search interface mockup

```
[Search bar] "What cats can user:anne manage right now?"
[Results at 2 PM]  ✅ cat:romeo (active sitter)
[Results at 6 PM]  ❌ (no results)

[Search bar] "Who can manage cat:romeo?"
[Results] ✅ user:bob (owner)
         ✅ user:jenny (admin)
         ✅ user:anne (when sitting active)

[Stick figure mind blown] "It works both directions!"
```

---

### Before/After Code Comparison

**Style:** David vs. Goliath

**Traditional Authorization (Goliath):**

```
[Massive code block visualization - tower of text]
async function canUpdateCat(userId, catId) {
  const user = await db.users.findById(userId);
  const cat = await db.cats.findById(catId);
  // ... 120+ more lines

[Stick figure crushed underneath] "Help..."
```

**ReBAC Authorization (David):**

```
[Small, clean code block]
const canUpdate = await fga.check({
  user: `user:${userId}`,
  relation: 'can_update',
  object: `cat:${catId}`
});

[Happy stick figure with slingshot] "I got this!"
```

---

### The Audit Trail Advantage

**Style:** Detective theme

```
[Detective stick figure with magnifying glass]
"Who accessed cat:romeo on September 1st at 2 PM?"

[OpenFGA responds with list]
✅ user:bob (owner)
✅ user:anne (active_sitter)
✅ user:jenny (admin)

[Traditional approach stick figure digging through logs]
"Let me grep through 47 log files..."
[Pile of log files crushing the figure]
```

---

### Final Slide: "Choose Your Future"

**Style:** Fork in the road

**Path 1 (Left):**

```
[Winding, treacherous path with obstacles]
"127-line functions"
"8 database queries"
"3 AM debugging sessions"
"Nested IF statements"
[Exhausted stick figure at the end]
```

**Path 2 (Right):**

```
[Smooth, straight path with flowers]
"Simple relationships"
"One API call"
"Declarative tests"
"Natural language logic"
[Happy stick figure at the end with a cat]
```

**Sign at fork:** "Choose wisely, your future self is watching"

---

### Bonus: Interactive Slides

**Audience Voting Slide:**

```
"What time should Anne try to update Romeo?"

A) 8:30 AM  [  ] votes
B) 2:00 PM  [  ] votes
C) 6:00 PM  [  ] votes
D) Midnight [  ] votes

[Live counter updates as audience raises hands]
```

**Live Demo Results:**

```
"Trying your suggestion..."
[Terminal window showing]
$ curl -X POST /api/cats/romeo/updates -H "Authorization: Bearer anne-token"
Status: 403 Forbidden
Response: {"error": "Not authorized at this time"}

[Audience reaction GIF placeholder]
```

## Key Takeaways

1. Authorization complexity grows exponentially without proper abstractions
2. ReBAC models relationships naturally, matching how we think about permissions
3. OpenFGA provides Google-scale authorization without the complexity
4. Interactive demos and audience participation make security topics engaging
5. The PurrfectSitter example demonstrates real-world patterns in an approachable way

## Resources

- **Demo Repository:** https://github.com/getlarge/purrfect-sitter
- **OpenFGA Documentation:** https://openfga.dev/docs
- **Original Article:** docs/articles/how-to-protect-your-api-with-openfga/README.md
- **OWASP API Security Top 10:** https://owasp.org/API-Security/editions/2023/en/0x11-t10/

## Speaker Notes

- Test all interactive elements before the talk
- Have backup plans for live demos
- Prepare answers for common ReBAC adoption questions
- Keep energy high throughout - this is HalfStack!
- Remember: entertainment + education = engagement
