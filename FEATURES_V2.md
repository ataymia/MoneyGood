# MoneyGood V2 Features

## Overview
This document describes the major enhancements added in Version 2 of MoneyGood, focusing on safety, marketplace functionality, and improved user experience.

---

## 🆕 New Features

### 1. Expanded Deal Types (Legs Model)

**Before:** Only 3 deal types (CASH_CASH, CASH_GOODS, GOODS_GOODS)

**Now:** 6 flexible deal types:
- `MONEY_MONEY` - Cash for cash agreements
- `MONEY_GOODS` - Cash for physical goods
- `MONEY_SERVICE` - Cash for services
- `GOODS_GOODS` - Goods for goods exchange
- `GOODS_SERVICE` - Goods for services exchange
- `SERVICE_SERVICE` - Service for service exchange

**Legs Model Structure:**
Each deal has two legs (legA and legB):
```typescript
{
  kind: 'MONEY' | 'GOODS' | 'SERVICE',
  description: string,
  declaredValueCents: number,
  moneyAmountCents?: number  // Only for MONEY kind
}
```

**Benefits:**
- More flexible than type-specific fields
- Service agreements now fully supported
- Better validation per leg type
- Backward compatible with legacy fields

---

### 2. Blocked Language Filtering

**Purpose:** Prevent wagering, betting, and gambling-related agreements

**Implementation:**
- Pattern-based regex filtering
- 20+ blocked patterns including:
  - Betting terms (bet, wager, gamble, odds, etc.)
  - Opposing positions (wins, loses, versus, etc.)
  - Paired agreements (linked, matched, paired, etc.)

**Where Applied:**
- Deal titles and descriptions
- Marketplace listing titles and descriptions
- Per-deal chat messages
- Leg descriptions

**User Experience:**
- Real-time validation with clear error messages
- Helpful examples of safe vs unsafe language
- Prevents submission with blocked terms

**Code Location:** `/blocked-language.js`

---

### 3. Public Marketplace

**Features:**
- Browse public deal listings
- Search and filter by deal type
- Create listings for others to join
- One-click join functionality

**Routes:**
- `/marketplace` - Browse listings feed
- `/marketplace/new` - Create new listing
- `/marketplace/:id` - View listing detail

**Listing Structure:**
```typescript
{
  title: string,
  description: string,
  type: DealType,
  tags: string[],
  status: 'open' | 'matched' | 'closed',
  createdByUid: string,
  createdByEmail: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Security:**
- Blocked language validation on all listings
- Authentication required to create listings
- Public read access for browsing

**Code Location:** `/ui/marketplace.js`, `/ui/marketplaceNew.js`

---

### 4. Per-Deal Chat

**Features:**
- Real-time messaging within each deal
- Participant-only access
- Blocked language validation on messages
- Message history persistence

**Chat Structure:**
```typescript
// Stored in subcollection: deals/{dealId}/messages/{messageId}
{
  text: string,
  senderUid: string,
  senderEmail: string,
  createdAt: Timestamp
}
```

**UI/UX:**
- Tab-based interface (Details / Chat / Activity)
- Chat bubbles styled by sender (emerald for own, navy for other)
- Real-time Firestore listener for instant updates
- Blocked language prevention with user-friendly errors

**Code Location:** `/ui/dealDetail.js` (renderChatTab, renderChatMessage)

---

### 5. Enhanced Landing Page

**New Sections:**

1. **Interactive Deal Type Tiles**
   - 3 hoverable cards: Money↔Money, Money↔Goods/Services, Goods↔Goods
   - Smooth animations with scale and translateY effects
   - Click to navigate to deal wizard

2. **How It Works Timeline**
   - 5-step visual timeline with numbered circles
   - Clear progression from create to complete
   - Fade-in animation on load

3. **Safety Rails Section**
   - 4 key safety features highlighted
   - Icons for audit log, mutual confirmation, dispute freeze, language policy
   - Trust-building content

4. **Examples Showcase**
   - 6 real-world example deals
   - Categorized by type (freelance, goods exchange, etc.)
   - Demonstrates proper use cases

**Code Location:** `/app.js` (renderLanding function)

---

### 6. Status Timeline Stepper

**Component:** `DealStatusTimeline({ currentStatus })`

**Visual Flow:**
```
invited → awaiting_funding → active → outcome_proposed → confirmed → completed
```

**Features:**
- Color-coded status indicators
- Check marks for completed stages
- Current status highlighted in emerald
- Handles frozen/cancelled states
- Responsive design

**Code Location:** `/ui/components.js`

---

### 7. Funding Checklist

**Component:** `FundingChecklist({ deal, isCreator, userId })`

**Displays:**
- Setup fees (creator vs participant)
- Cash contributions
- Fairness hold collateral
- Completion status per item
- Action buttons for unpaid items

**Visual Design:**
- Check marks for completed payments
- Color-coded indicators (emerald for complete, amber for pending)
- Grouped by payment type

**Code Location:** `/ui/components.js`

---

### 8. Skeleton Loaders

**Components:**
- `SkeletonCard({ count })` - Card placeholders
- `SkeletonList({ count })` - List item placeholders

**Features:**
- Shimmer animation (pulse effect)
- Match real component dimensions
- Improve perceived performance

**Usage:**
```javascript
// While loading
return SkeletonList({ count: 3 });

// After data loads
return renderActualContent(data);
```

**Code Location:** `/ui/components.js`

---

### 9. Microinteractions & Animations

**CSS Animations Added:**

1. **Confetti Fall** - Celebration on deal completion/creation
   ```javascript
   showConfetti(); // Generates 50 falling confetti pieces
   ```

2. **Bounce Slow** - Gentle bounce for CTAs
   ```css
   .animate-bounce-slow { animation: bounceSlow 3s infinite; }
   ```

3. **Interactive Tiles** - Hover lift effect
   ```css
   .interactive-tile:hover { transform: translateY(-8px) scale(1.02); }
   ```

4. **Count Up** - Number increment animation
   ```css
   @keyframes countUp { from { opacity: 0; } to { opacity: 1; } }
   ```

5. **Pulse** - Breathing effect for loading states
   ```css
   .animate-pulse { animation: pulse 2s infinite; }
   ```

**Code Location:** `/styles.css`, `/ui/components.js` (showConfetti)

---

### 10. Improved Deal Detail Page

**New Tabbed Interface:**
- **Details Tab:** Deal info, funding checklist, action buttons
- **Chat Tab:** Per-deal messaging
- **Activity Tab:** Audit log timeline

**Visual Enhancements:**
- Status timeline stepper at top
- Funding checklist with visual progress
- Proper display of fairness holds (fairnessHoldAmountCentsA/B)
- Leg-based information display

**Payment Purpose Mapping:**
Frontend sends: `setup_fee`, `contribution`, `fairness_hold`
Backend expects: `SETUP_FEE`, `CONTRIBUTION`, `FAIRNESS_HOLD`

Automatically mapped in `handlePayment()`.

**Code Location:** `/ui/dealDetail.js`

---

## 🔧 Technical Improvements

### Backend Updates

1. **validators.ts**
   - Added LegSchema with kind enum
   - Expanded deal type options to 6 types
   - Added legA/legB optional fields with refinement
   - Backward compatible with legacy fields

2. **dealMachine.ts**
   - Added `outcome_proposed` and `confirmed` states
   - Added new deal types to DealType enum
   - Added `normalizeDealType()` for backward compatibility
   - Updated state transitions for new flow

3. **index.ts (Cloud Functions)**
   - Updated `createDeal` to store both old and new fairness hold field names
   - Added legA/legB fields to deal creation
   - Fixed FAIRNESS_HOLD payment purpose to use correct field names
   - Maintained backward compatibility

### Frontend Updates

1. **dealWizard.js**
   - Complete rewrite with legs model
   - Dynamic form fields based on leg kind
   - Blocked language validation on Step 1
   - 6 deal type options on Step 2
   - Confetti animation on successful creation

2. **components.js**
   - Added DealStatusTimeline component
   - Added FundingChecklist component
   - Added SkeletonCard and SkeletonList
   - Added showConfetti function
   - Updated Navbar with marketplace link

3. **app.js**
   - Complete landing page overhaul
   - Registered marketplace routes
   - Enhanced renderJoinDeal with preview card

4. **dealDetail.js**
   - Major restructure with tabs
   - Integrated DealStatusTimeline
   - Added chat functionality
   - Fixed fairness hold display
   - Added payment purpose mapping

---

## 📊 Data Model Changes

### Deal Document Structure

**New Fields:**
```typescript
{
  // New legs model (optional)
  legA?: {
    kind: 'MONEY' | 'GOODS' | 'SERVICE',
    description: string,
    declaredValueCents: number,
    moneyAmountCents?: number
  },
  legB?: { /* same structure */ },
  
  // Corrected fairness hold field names
  fairnessHoldAmountCentsA?: number,
  fairnessHoldAmountCentsB?: number,
  
  // Old fields maintained for backward compatibility
  fairnessHoldA?: number,
  fairnessHoldB?: number,
  
  // Legacy deal type fields still supported
  moneyAmountCents?: number,
  goodsA?: string,
  goodsB?: string,
  declaredValueA?: number,
  declaredValueB?: number
}
```

### New Collections

1. **listings** - Marketplace listings
   ```typescript
   {
     title, description, type, tags,
     status, createdByUid, createdByEmail,
     createdAt, updatedAt
   }
   ```

2. **deals/{dealId}/messages** - Per-deal chat
   ```typescript
   {
     text, senderUid, senderEmail,
     createdAt
   }
   ```

---

## 🚀 Migration Guide

### For Existing Deals

**Backward Compatibility Maintained:**
- Old deal types (CASH_CASH, CASH_GOODS, GOODS_GOODS) still work
- Legacy fields (goodsA, goodsB, declaredValueA, declaredValueB) still supported
- `normalizeDealType()` maps old types to new types
- UI displays both old and new field formats

**No Migration Required:**
Existing deals will continue to function without changes.

### For New Development

**Recommended Approach:**
1. Use new deal types (MONEY_*, GOODS_*, SERVICE_*)
2. Use legs model (legA, legB) for new deals
3. Backend stores both old and new field names for compatibility
4. Frontend can read either format

---

## 📝 Best Practices

### Creating Agreements

**DO:**
- Use clear, descriptive titles
- Specify exact deliverables
- Set reasonable deadlines
- Provide detailed leg descriptions
- Use marketplace for public opportunities

**DON'T:**
- Use wagering or betting terminology
- Create opposing position agreements
- Link multiple agreements together
- Reference external events as triggers
- Use vague or ambiguous language

### Using Chat

**DO:**
- Communicate clearly about deliverables
- Ask clarifying questions
- Document agreed changes
- Keep discussion professional

**DON'T:**
- Use blocked language (betting terms, etc.)
- Share sensitive payment information
- Make side deals outside the platform
- Use offensive or harassing language

---

## 🎯 Future Enhancements

### Potential Features
- [ ] Server-side blocked language validation in Cloud Functions
- [ ] Integrate skeleton loaders in dashboard.js
- [ ] Enhanced audit log visualizations
- [ ] Marketplace search and filtering
- [ ] Deal templates
- [ ] Bulk operations
- [ ] Advanced analytics
- [ ] Mobile app

### Infrastructure Improvements
- [ ] CDN for static assets
- [ ] Error monitoring (Sentry)
- [ ] Performance monitoring
- [ ] Automated testing (Cypress)
- [ ] A/B testing framework

---

## 📚 Documentation

**Updated Files:**
- [README.md](./README.md) - Main documentation with new features
- [SUMMARY.md](./SUMMARY.md) - Build summary with updated counts
- [FEATURES_V2.md](./FEATURES_V2.md) - This document
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - File organization

**Additional Guides:**
- [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md) - Cloudflare Pages setup
- [GITHUB_PAGES_DEPLOYMENT.md](./GITHUB_PAGES_DEPLOYMENT.md) - GitHub Pages setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Firebase Hosting setup
- [DEMO_MODE.md](./DEMO_MODE.md) - Demo mode without Firebase

---

## 📞 Support

For questions or issues:
1. Check documentation in this repository
2. Review code comments in relevant files
3. Test in demo mode first (see DEMO_MODE.md)
4. Ensure Firebase and Stripe are properly configured

---

**Built with ❤️ for secure, trustworthy two-party transactions**

**MoneyGood V2 - More flexible. More visual. More secure.** 💰
