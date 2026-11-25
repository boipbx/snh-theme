# SNH Staff: set up a counter device (2 minutes)

**SNH Staff** is the counter app for finding a customer, adding a new one, fixing their details and seeing their Elite points.
Link: **https://snh-ops.raspy-wind-fe2d.workers.dev/console**

Each device needs two things, once:
1. An **SNH Staff icon** on its home screen.
2. A **registration**, using a code from an admin.

After that, staff tap the icon, tap their name and type their 6-digit PIN.

---

## 1. Admin: make a device code (30 seconds)

1. On your own device, open SNH Staff and sign in.
2. Tap **Devices**.
3. Type a device name, for example `Nugegoda counter iPad`, and pick the shop.
4. Tap **New code** and enter your PIN.
5. A code like `K7QM-3XPA` appears. It works **once**, for **24 hours**.

## 2. On the new device: add the icon

### iPad / iPhone (Safari)
1. Open **Safari**. It must be Safari, not Chrome.
2. Go to `snh-ops.raspy-wind-fe2d.workers.dev/console`.
3. Tap the **Share** button (the square with an arrow, top right).
4. Tap **Add to Home Screen**, then **Add**.
5. Close Safari and open **SNH Staff** from the home screen.

### Android tablet or phone (Chrome)
1. Open **Chrome** and go to `snh-ops.raspy-wind-fe2d.workers.dev/console`.
2. Tap **⋮** (top right), then **Add to Home screen** (or **Install app**), then **Install**.
3. Open **SNH Staff** from the home screen.

### Windows PC / CloudPOS machine (Chrome or Edge)
1. Open **Chrome** (or **Edge**) and go to `snh-ops.raspy-wind-fe2d.workers.dev/console`.
2. **Chrome:** click the **install** icon at the right end of the address bar (a small screen with a down arrow). You can also click **⋮**, then **Cast, save and share**, then **Install page as app**.
   **Edge:** click **…**, then **Apps**, then **Install this site as an app**.
3. Click **Install**. SNH Staff opens in its own window and gets a Start-menu icon.
4. Optional: right-click the icon on the taskbar and choose **Pin to taskbar**.

## 3. On the new device: register it (30 seconds)

1. Open SNH Staff. It shows **Register this device**.
2. Type the code from step 1 and tap **Register**.
3. The staff list appears. The device is done.

Do it in this order (icon first, then the code). On iPad the home-screen app keeps its own sign-in, separate from Safari, so register inside the icon.

## Every day

- Tap the **SNH Staff** icon, tap your name and type your PIN.
- It **locks after 5 minutes** without a tap. Type your PIN to carry on, or tap **Sign out (someone else)**.
- **5 wrong PINs** lock that person for 15 minutes. An admin can reset a PIN in **Staff**.
- Sign-in lasts 12 hours at most.

## What staff can do

| | Staff | Admin |
|---|---|---|
| Find a customer by phone (any format: `077 123 4567`, `+94…`), email or name | ✓ | ✓ |
| See tier, points (and their Rs value), annual spend, progress to the next tier, reward codes, last 5 orders, points history | ✓ | ✓ |
| Add a customer. Shopify emails them the account invite; welcome points come when they accept it. Email offers stay unticked unless the customer says yes. | ✓ | ✓ |
| Edit name, phone, email, birthday, email offers (with a short reason) | ✓ | ✓ |
| **Redeem Rs 2,500** for a member with 2,500+ points and an active account: the code shows big on screen, then type or paste it into POS as a discount code | ✓ | ✓ |
| Open the customer in Shopify | ✓ | ✓ |
| Add or take away points (a reason is required; at most 5,000 per change and 20,000 a day per admin; PIN again) | | ✓ |
| Add staff, disable, reset a PIN, set role and shop; make or revoke device codes; see and export the audit log | | ✓ |

Redemption follows the same switch as the website (`REDEEM_MODE`). While it is in **test mode**, only QA customers can redeem, and the screen says so.

## Lost or stolen device

An admin opens **Devices** and taps **Revoke**. That device is signed out at once and cannot get back in without a new code.

## POS tile (inside Shopify POS)

The code is ready in `apps/snh-ops/extensions/snh-staff-tile/`. It adds an **SNH Staff** tile to the POS smart grid. The tile shows the Elite points of the customer on the current cart; everything else stays in the SNH Staff app.

Shopify only lets an extension be deployed through the Shopify CLI with an interactive login, which this setup could not do. To deploy it, run these three commands on a computer with Node 20+, from the repository folder:

```bash
cd apps/snh-ops && npm install --prefix extensions/snh-staff-tile
```

```bash
npx @shopify/cli@latest app config link
```
(choose the **SNH Ops** app when asked)

```bash
npx @shopify/cli@latest app deploy
```

Then, in Shopify POS on each device, open **Settings → Smart grid → Edit** and add the **SNH Staff** tile. Until then, use the home-screen icon.

## For the record

- **Security:**
  - PINs are stored only as PBKDF2-SHA256 hashes (100,000 rounds, a different salt per person).
  - Device and session cookies are httpOnly, Secure and SameSite=Strict.
  - Every write also needs a custom header, so another website cannot act for a signed-in device.
- **Audit:** every action is logged (who, device, shop, customer, before/after, reason, time). Admins can export it as CSV from **Audit**.
- **Ledger:** every points change made by SNH Staff, the redeem service or the welcome points is recorded, from 25 Nov 2026 on. It shows on the customer's card under **Points history**.
- **New setup link** (for example, if every admin is gone): run `node scripts/console-setup-link.mjs` in `apps/snh-ops` with the Cloudflare keys set. It works only while no admin exists.
