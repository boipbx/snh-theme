// Round 16: proof frames of the flip mid-way (the test slows the transition to 4 s for the capture only).
process.env.SHOTS = 'r16';
const { chromium, context, open, out } = require('./r14-lib.js');
const path = require('path'), CD = out('card');
(async () => {
  const b = await chromium.launch();
  for (const w of [1440, 390]) {
    const c = await context(b, w), p = await c.newPage();
    for (const t of ['bronze', 'silver', 'gold']) {
      await open(p, `/pages/about-us?view=elite-mock-${t}`); await p.waitForTimeout(1500);
      const card = p.locator('.app__hero--cards .elc'), wrap = p.locator('.app__hero--cards .elc-wrap');
      await card.scrollIntoViewIfNeeded(); await p.addStyleTag({ content: '.app__hero--cards .elc__in { transition-duration: 4s !important; transition-timing-function: linear !important; }' });
      await card.click({ position: { x: 40, y: 40 } }); await p.waitForTimeout(1300);
      const tf = await card.evaluate((e) => getComputedStyle(e.querySelector('.elc__in')).transform);
      await wrap.screenshot({ path: path.join(CD, `${t}-midflip-${w}.png`) });
      console.log(w, t, tf.slice(0, 40));
    }
    await c.close();
  }
  await b.close();
})();
