# Usage Examples

Practical examples illustrating each rule in `CLAUDE.md`, contrasting common assistant mistakes with cleaner approaches—including reusing and adapting existing library components (`components/`) to build cohesive design patterns while reducing token usage.

---

## 1. Clarify Before Building

### Example: Ambiguous Feature Scope

**Request:** "Add a feature to export user records"

**❌ Common Mistake (Silent Assumptions)**

```python
def export_users(fmt="json"):
    rows = User.query.all()
    if fmt == "json":
        with open("users.json", "w") as f:
            json.dump([r.to_dict() for r in rows], f)
    elif fmt == "csv":
        with open("users.csv", "w") as f:
            writer = csv.DictWriter(f, fieldnames=["id", "email", "name"])
            writer.writeheader()
            writer.writerows([r.to_dict() for r in rows])
    return f"Exported {len(rows)} users"
```

**Why it falls short:** Picks output format, destination, and fields without confirming privacy rules, pagination, or actual schema.

**✅ Better Approach (Surface Assumptions)**

```text
Before implementing, please clarify:
1. Scope: Full dataset or filtered subset?
2. Delivery: Browser download, background job, or API response?
3. Fields: Which columns are permitted (excluding sensitive data)?

Simplest starting point: a paginated API endpoint. Confirm if that fits.
```

---

## 2. Keep It Minimal

### Example: Premature Abstraction

**Request:** "Add a discount calculation helper"

**❌ Common Mistake (Over-engineered Setup)**

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

class DiscountRule(ABC):
    @abstractmethod
    def apply(self, total: float) -> float: ...

class PercentRule(DiscountRule):
    def __init__(self, pct: float):
        self.pct = pct
    def apply(self, total: float) -> float:
        return total * (self.pct / 100)

@dataclass
class DiscountPolicy:
    rule: DiscountRule
    floor: float = 0.0
```

**Why it falls short:** Heavy class hierarchy for a single straightforward formula.

**✅ Better Approach (Minimal & Direct)**

```python
def calc_discount(total: float, percent: float) -> float:
    return total * (percent / 100)
```

---

## 3. Reuse and Adapt Local Components First

### Example A: Composing UI From Existing Library Components

**Request:** "Add a top navigation bar with a clean button on the pricing page"

**❌ Common Mistake (Writing Everything From Scratch & Burning Tokens)**

```tsx
// Writes a brand-new navbar and custom button with 140 lines of inline styles
// and new CSS tokens when components/<category>/<variant>/ already has similar pieces
export function PricingHeader() {
  return (
    <header className="flex items-center justify-between px-8 py-4 bg-slate-950 text-white border-b border-slate-800">
      {/* ...duplicated layout and custom button markup... */}
    </header>
  );
}
```

**Why it falls short:** Ignores `components/`, duplicates existing UI patterns, and wastes context/output tokens on boilerplate.

**✅ Better Approach (Reuse `components/`, Adapt Colors/Props, Check `notes.md`)**

```tsx
// Reuses existing variants from components/ and adjusts accent colors to fit the page
import { Component as Navbar } from "@/components/navbar/minimal-navbar/Component";
import { Component as ActionButton } from "@/components/button/solid-button/Component";

export function PricingHeader() {
  return (
    <div className="bg-zinc-950 text-zinc-100">
      <Navbar className="border-zinc-800"/>
      <ActionButton className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950"/>
    </div>
  );
}
```

### Example B: Adapting Styles & Colors Without Rebuilding

**Request:** "Match this card component's accent color and spacing to our warm theme"

**❌ Common Mistake (Rewriting Component & Duplicating CSS From Scratch)**

```tsx
// Creates a whole new component file and rewrites layout rules instead of adapting
// the existing variant and checking its notes.md for dependencies/usage
export function CustomWarmCard() {
  // 90 lines of redundant markup and styles
}
```

**✅ Better Approach (Targeted Color/Style Adaptation + `notes.md` Check)**

```css
/* Adapt only the color/accent tokens needed for the target design pattern */
.card-accent {
  --accent-color: #f59e0b;
  --accent-hover: #d97706;
}
```

```tsx
// Check components/card/<variant>/notes.md first, then adapt props/styles cleanly
import { Component as InfoCard } from "@/components/card/clean-card/Component";

export function WarmInfoCard({ title }: { title: string }) {
  return <InfoCard className="card-accent" title="{title}"/>;
}
```

**Why it works:** Reuses existing components and variants, adapts colors and props to form a cohesive design pattern, and keeps token usage minimal.

---

## 4. Make Targeted Edits

### Example: Fixing Empty Input Without Touching Unrelated Code

**Request:** "Fix empty string handling in the email check"

**❌ Common Mistake (Unrequested Refactors & Formatting Churn)**

```diff
- def check_email(email):
-     if not email:
-         return False
-     return "@" in email
+ def validate_email_address(email: str) -> bool:
+     """Validate user email address."""
+     cleaned = (email or "").strip()
+     if not cleaned or "@" not in cleaned or "." not in cleaned.split("@")[-1]:
+         raise ValueError("Invalid email")
+     return True
```

**Why it falls short:** Renames the function, changes return semantics to exceptions, adds docstrings/types, and alters unrelated rules.

**✅ Better Approach (Surgical Change)**

```diff
  def check_email(email):
-     if not email:
+     if not email or not email.strip():
          return False
      return "@" in email
```

---

## 5. Verify Against Clear Goals

### Example: Step-by-Step Plan With Checks

**Request:** "Add request rate limiting to the API"

**❌ Common Mistake (Vague Hand-Waving)**

```text
I'll add rate limiting and test everything to make sure it works well.
```

**✅ Better Approach (Concrete Checkpoints)**

```text
1. Add per-route request counter -> verify: burst past limit returns HTTP 429.
2. Wire shared store configuration -> verify: counter persists across restarts.
3. Run existing API suite -> verify: all prior tests pass with no regressions.
```

---

## Quick Reference

| Rule | Avoid | Prefer |
|------|-------|--------|
| Clarify Before Building | Guessing scope, format, or fields | Asking brief, direct questions first |
| Keep It Minimal | Extra layers for simple logic | Smallest clear implementation |
| Reuse & Adapt Components | Rebuilding UI from scratch & over-spending tokens | Reusing `components/` and adjusting colors/props |
| Make Targeted Edits | Rewriting nearby code or style | Editing only lines tied to the task |
| Verify Against Clear Goals | Vague promises | Explicit steps with pass/fail checks |
s={response.status_code}')
              return False
      except Exception as e:
-         print(f"Error: {e}")
+         logger.exception(f'Upload error: {file_path}')
          return False
```

**Matched:** Single quotes, no type hints, existing boolean pattern, spacing style.

---

## 4. Goal-Driven Execution

### Example 1: Vague vs. Verifiable

**User Request:** "Fix the authentication system"

**❌ What LLMs Do (Vague Approach)**

```
I'll fix the authentication system by:
1. Reviewing the code
2. Identifying issues
3. Making improvements
4. Testing the changes

[Proceeds to make changes without clear success criteria]
```

**✅ What Should Happen (Verifiable Goals)**

```
To "fix authentication," I need to define success criteria. 
What specific issue are we solving?

If the issue is "users stay logged in after password change":

Plan:
1. Write test: Change password → verify old session invalidated
   Verify: Test fails (reproduces bug)

2. Implement: Invalidate sessions on password change
   Verify: Test passes

3. Check edge cases: Multiple active sessions, concurrent changes
   Verify: Additional tests pass

4. Verify no regression: Existing auth tests still pass
   Verify: Full test suite green

Current test coverage for auth: [shows coverage]
What's the specific auth issue you're seeing?
```

### Example 2: Multi-Step with Verification

**User Request:** "Add rate limiting to the API"

**❌ What LLMs Do (All at Once)**

```python
# Implements full rate limiting with Redis, multiple strategies,
# configuration system, and monitoring in one 300-line commit
# No clear verification steps
```

**✅ What Should Happen (Incremental with Verification)**

```
Plan for rate limiting:

1. Add basic in-memory rate limiting (single endpoint)
   Verify: 
   - Test: 100 requests → first 10 succeed, rest get 429
   - Manual: curl endpoint 11 times, see rate limit error

2. Extract to middleware (apply to all endpoints)
   Verify:
   - Test: Rate limits apply to /users and /posts
   - Existing endpoint tests still pass

3. Add Redis backend (for multi-server)
   Verify:
   - Test: Rate limit persists across app restarts
   - Test: Two app instances share rate limit counter

4. Add configuration (rates per endpoint)
   Verify:
   - Test: /search allows 10/min, /users allows 100/min
   - Config file parsed correctly

Each step is independently verifiable and deployable.
Start with step 1?
```

### Example 3: Test-First Verification

**User Request:** "The sorting breaks when there are duplicate scores"

**❌ What LLMs Do (Fix Without Reproducing)**

```python
# Immediately changes sort logic without confirming the bug
def sort_scores(scores):
    return sorted(scores, key=lambda x: (-x['score'], x['name']))
```

**✅ What Should Happen (Reproduce First)**

```python
# 1. First, write a test that reproduces the issue
def test_sort_with_duplicate_scores():
    """Test sorting when multiple items have same score."""
    scores = [
        {'name': 'Alice', 'score': 100},
        {'name': 'Bob', 'score': 100},
        {'name': 'Charlie', 'score': 90},
    ]
    
    result = sort_scores(scores)
    
    # The bug: order is non-deterministic for duplicates
    # Run this test multiple times, it should be consistent
    assert result[0]['score'] == 100
    assert result[1]['score'] == 100
    assert result[2]['score'] == 90

# Verify: Run test 10 times → fails with inconsistent ordering

# 2. Now fix with stable sort
def sort_scores(scores):
    """Sort by score descending, then name ascending for ties."""
    return sorted(scores, key=lambda x: (-x['score'], x['name']))

# Verify: Test passes consistently
```

---

## Anti-Patterns Summary

| Principle | Anti-Pattern | Fix |
|-----------|-------------|-----|
| Think Before Coding | Silently assumes file format, fields, scope | List assumptions explicitly, ask for clarification |
| Simplicity First | Strategy pattern for single discount calculation | One function until complexity is actually needed |
| Surgical Changes | Reformats quotes, adds type hints while fixing bug | Only change lines that fix the reported issue |
| Goal-Driven | "I'll review and improve the code" | "Write test for bug X → make it pass → verify no regressions" |

## Key Insight

The "overcomplicated" examples aren't obviously wrong—they follow design patterns and best practices. The problem is **timing**: they add complexity before it's needed, which:

- Makes code harder to understand
- Introduces more bugs
- Takes longer to implement
- Harder to test

The "simple" versions are:
- Easier to understand
- Faster to implement
- Easier to test
- Can be refactored later when complexity is actually needed

**Good code is code that solves today's problem simply, not tomorrow's problem prematurely.**
