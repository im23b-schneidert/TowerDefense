import { Selector } from 'testcafe';

fixture('Wikipedia Random Page Test').page('https://en.wikipedia.org/wiki/Special:Random');

test('Follow first Wikipedia links until Philosophy or loop', async (t) => {
  const runs = 30;
  const maxSteps = 80;
  const runResults = [];

  for (let run = 1; run <= runs; run += 1) {
    const result = await runSingleAttempt(t, run, maxSteps);
    runResults.push(result);

    // eslint-disable-next-line no-console
    console.log(
      `[Wikipedia Try] run=${result.run}, steps=${result.steps}, start="${result.startTitle}", end="${result.finalTitle}", finished=${result.finishedBecauseOf}`
    );
  }

  const bestSuccess = runResults
    .filter((r) => r.finishedBecauseOf === 'philosophy')
    .sort((a, b) => b.steps - a.steps)[0];

  const bestFallback = runResults.sort((a, b) => b.steps - a.steps)[0];
  const bestTry = bestSuccess ?? bestFallback;

  await t.expect(bestTry).ok('No attempt result was collected.');

  // eslint-disable-next-line no-console
  console.log(
    `[Wikipedia Best Try] run=${bestTry.run}, finished=${bestTry.finishedBecauseOf}, steps=${bestTry.steps}, finalTitle="${bestTry.finalTitle}"`
  );
});

const runSingleAttempt = async (t, run, maxSteps) => {
  await t.navigateTo('https://en.wikipedia.org/wiki/Special:Random');

  const visitedTitles = new Set();
  let finishedBecauseOf = 'max_steps';
  let startTitle = '';
  let finalTitle = '';
  let steps = 0;

  for (let i = 0; i < maxSteps; i += 1) {
    const title = await getTitleText(t);
    if (!startTitle) startTitle = title;
    finalTitle = title;
    steps += 1;

    if (title === 'Philosophy') {
      finishedBecauseOf = 'philosophy';
      break;
    }

    if (visitedTitles.has(title)) {
      finishedBecauseOf = 'loop';
      break;
    }

    visitedTitles.add(title);
    const firstValidLink = await getFirstValidLink(t);
    await t.click(firstValidLink);
  }

  return { run, steps, finishedBecauseOf, startTitle, finalTitle };
};

const getTitleText = async (t) => {
  const title = Selector('#firstHeading');
  await t.expect(title.exists).ok({ timeout: 10000 });
  return title.innerText;
};

const getFirstValidLink = async (t) => {
  const content = Selector('#mw-content-text');
  await t.expect(content.exists).ok({ timeout: 10000 });

  // Prefer links in article paragraphs and ignore common non-game links.
  const firstValidLink = content.find('p a[href^="/wiki/"]').filter((node) => {
    const href = node.getAttribute('href') || '';
    const text = node.textContent || '';

    const isInsideParentheses = (() => {
      const paragraph = node.closest('p');
      if (!paragraph) return false;

      let depth = 0;

      const walkUntilNode = (current) => {
        if (current === node) return true;

        if (current.nodeType === Node.TEXT_NODE) {
          const value = current.textContent || '';
          for (let i = 0; i < value.length; i += 1) {
            const ch = value[i];
            if (ch === '(') depth += 1;
            if (ch === ')') depth = Math.max(0, depth - 1);
          }
        }

        for (let i = 0; i < current.childNodes.length; i += 1) {
          if (walkUntilNode(current.childNodes[i])) return true;
        }

        return false;
      };

      walkUntilNode(paragraph);
      return depth > 0;
    })();

    return (
      href &&
      !href.includes(':') &&
      !href.includes('#') &&
      !text.includes('ɲihoŋɡo') &&
      !isInsideParentheses &&
      !node.closest('i') &&
      !node.closest('sup') &&
      !node.closest('.IPA') &&
      !node.closest('.hatnote') &&
      !node.closest('.infobox') &&
      !node.classList.contains('mw-redirect')
    );
  }).nth(0);

  await t.expect(firstValidLink.exists).ok({ timeout: 10000 });
  return firstValidLink;
};
