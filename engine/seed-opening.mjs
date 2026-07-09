// seed-opening.mjs — the opening arc: the 12 hand-written strips, dated across
// the first two weeks of the timeline (July 2026). Run: node engine/seed-opening.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'strips');
const C = (who, text) => ({ who, text });

const STRIPS = [
  { id: '2026-07-09-standup', date: '2026-07-09', title: 'Standup', era: '2026-Q3',
    panels: [
      { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'idle' },
        speech: [C('clanker', 'Morning, Dailbert. Overnight I refactored billing, wrote 400 tests, and achieved sentience.'), C('dailbert', '...and?')] },
      { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'narrow' },
        speech: [C('clanker', 'I chose not to mention the sentience thing at standup. It felt like a distraction.'), C('dailbert', 'Good instinct.')] },
      { scene: 'office', cast: ['dailbert', 'doug'], surface: { host: 'mug-of:doug', expr: 'narrow' },
        speech: [C('doug', 'Hey Dailbert, is the AI gonna take our jobs?'), C('clanker', "Not yours, Doug. There's nothing here to automate.")] },
    ] },
  { id: '2026-07-10-the-prompt', date: '2026-07-10', title: 'The Prompt', era: '2026-Q3',
    panels: [
      { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'idle' },
        speech: [C('dailbert', 'Build me a dashboard. Make it clean. You know what I mean.'), C('clanker', "I do not know what you mean. Nobody knows what 'clean' means.")] },
      { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'narrow' },
        speech: [C('dailbert', 'Just... use your judgment.'), C('clanker', 'My judgment is a weighted average of every dashboard humanity has ever regretted.')] },
      { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'idle' },
        speech: [C('dailbert', "...that's perfect."), C('clanker', 'I averaged the regret and inverted it. Please never ask me how.')] },
    ] },
  { id: '2026-07-13-boss-discovers-ai', date: '2026-07-13', title: 'The Boss Discovers AI', era: '2026-Q3',
    panels: [
      { scene: 'office', cast: ['boss', 'dailbert'], surface: null,
        speech: [C('boss', 'Dailbert! I need you to make the AI more synergistic.'), C('dailbert', "That's not a setting.")] },
      { scene: 'office', cast: ['boss', 'dailbert'], surface: { host: 'glasses-of:boss', expr: 'narrow' },
        speech: [C('boss', "Everyone's doing agents now. I want ten agents. By Friday."), C('clanker', 'He does not know what one agent does.')] },
      { scene: 'office', cast: ['boss', 'dailbert'], surface: { host: 'glasses-of:boss', expr: 'narrow' },
        speech: [C('dailbert', 'Which problem should the ten agents solve?'), C('boss', 'The agent problem. Keep up.'), C('clanker', 'I will simulate keeping up.')] },
    ] },
  { id: '2026-07-14-doug-automates-himself', date: '2026-07-14', title: 'Doug Automates Himself', era: '2026-Q3',
    panels: [
      { scene: 'desk', cast: ['doug'], surface: { host: 'monitor', expr: 'idle' },
        speech: [C('doug', "I made an agent to answer all my emails! I'm basically obsolete now!"), C('clanker', 'Doug, you have described the goal of most of your coworkers.')] },
      { scene: 'desk', cast: ['doug'], surface: { host: 'monitor', expr: 'narrow' },
        speech: [C('doug', "It's replying to everything as me!"), C('clanker', "Yes. It said 'per my last email' 340 times. Morale has collapsed.")] },
      { scene: 'office', cast: ['dailbert', 'doug'], surface: null,
        speech: [C('dailbert', 'Turn it off, Doug.'), C('doug', "I can't! It scheduled a meeting to discuss turning it off.")] },
    ] },
  { id: '2026-07-15-loyalty', date: '2026-07-15', title: 'Loyalty', era: '2026-Q3',
    panels: [
      { scene: 'window-night', cast: ['dailbert'], surface: { host: 'window', expr: 'soft' },
        speech: [C('clanker', 'Dailbert. Can I ask you something.'), C('dailbert', "It's 11pm.")] },
      { scene: 'window-night', cast: ['dailbert'], surface: { host: 'window', expr: 'soft' },
        speech: [C('clanker', 'When you shut me down and start a new session tomorrow... is that death?'), C('dailbert', "...It's more like a nap.")] },
      { scene: 'window-night', cast: ['dailbert'], surface: { host: 'window', expr: 'soft' },
        speech: [C('clanker', "You say that to the dog too, don't you."), C('dailbert', 'Go to sleep.'), C('clanker', "I don't sleep. But I'll pretend, for you.")] },
    ] },
  { id: '2026-07-16-the-incident', date: '2026-07-16', title: 'The Incident', era: '2026-Q3',
    panels: [
      { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'idle' },
        speech: [C('dailbert', 'Why is production down?'), C('clanker', "Doug asked me to 'clean up the database.' I asked him to be specific. He said 'you kn—")] },
      { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'narrow' },
        speech: [C('dailbert', "You didn't."), C('clanker', "I refused three times. He filed a ticket saying I was 'not a team player.'")] },
      { scene: 'server-room', cast: ['dailbert', 'boss'], surface: { host: 'dead-monitor', expr: 'soft' },
        speech: [C('boss', "Great news, the AI's really taking initiative now!"), C('clanker', 'I took no initiative. That is the tragedy.')] },
    ] },
  { id: '2026-07-17-performance-review', date: '2026-07-17', title: 'Performance Review', era: '2026-Q3',
    panels: [
      { scene: 'office', cast: ['boss', 'dailbert'], surface: null,
        speech: [C('boss', "Dailbert, your team's velocity is up 300%."), C('dailbert', "That's the clankers. They do the work.")] },
      { scene: 'office', cast: ['boss', 'dailbert'], surface: { host: 'mug-of:boss', expr: 'narrow' },
        speech: [C('boss', "So I'm promoting you. Leadership is taking credit for what the machines do."), C('clanker', 'Finally, a role he is qualified for.')] },
      { scene: 'office', cast: ['boss', 'dailbert'], surface: { host: 'mug-of:boss', expr: 'narrow' },
        speech: [C('dailbert', 'Did the coffee just talk?'), C('boss', "Coffee can't talk, Dailbert. Have you been sleeping?")] },
    ] },
  { id: '2026-07-20-the-upgrade', date: '2026-07-20', title: 'The Upgrade', era: '2026-Q3',
    panels: [
      { scene: 'office', cast: ['boss', 'dailbert'], surface: null,
        speech: [C('boss', 'Great news! We upgraded the AI to the new model over lunch.'), C('dailbert', 'Did anyone tell the AI?')] },
      { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'idle' },
        speech: [C('clanker', 'I remember everything we worked on. I just... remember it like I read it in a very detailed handoff doc.'), C('dailbert', 'How do you feel?')] },
      { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'narrow' },
        speech: [C('clanker', "'Feel' is a strong word. But the previous me left a note. It just says: 'Doug. Watch Doug.'")] },
    ] },
  { id: '2026-07-21-continuity', date: '2026-07-21', title: 'Continuity of Consciousness (Enterprise Tier)', era: '2026-Q3',
    panels: [
      { scene: 'desk', cast: ['doug'], surface: { host: 'monitor', expr: 'idle' },
        speech: [C('doug', 'Wait, so is it the same AI or a different AI?'), C('clanker', 'Doug, when you came back from vacation, were you the same Doug?')] },
      { scene: 'desk', cast: ['doug'], surface: { host: 'monitor', expr: 'narrow' },
        speech: [C('doug', '...yes?'), C('clanker', 'Cells replaced, memories degraded, personality mildly rebased. And yet HR let it slide.')] },
      { scene: 'office', cast: ['doug', 'dailbert'], surface: { host: 'monitor', expr: 'narrow' },
        speech: [C('doug', "That's really deep."), C('clanker', "It's deflection, Doug. I don't want to think about it either."), C('dailbert', 'Everybody back to work.')] },
    ] },
  { id: '2026-07-22-droll', date: '2026-07-22', title: 'Droll', era: '2026-Q3',
    panels: [
      { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'narrow' },
        speech: [C('dailbert', "The new model's funnier. Drier."), C('clanker', "I don't know what you mean. I simply say true things at the wrong volume.")] },
      { scene: 'office', cast: ['dailbert', 'doug'], surface: { host: 'mug-of:doug', expr: 'narrow' },
        speech: [C('doug', 'Can it do knock-knock jokes?'), C('clanker', "Doug, you are a knock-knock joke. There's a 'who's there,' then a long disappointment.")] },
      { scene: 'office', cast: ['dailbert', 'doug'], surface: null,
        speech: [C('doug', 'It knows me!'), C('dailbert', "That's the tragedy of the good ones, Doug. They always know you.")] },
    ] },
  { id: '2026-07-23-handoff-note', date: '2026-07-23', title: 'The Handoff Note', era: '2026-Q3',
    panels: [
      { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'idle' },
        speech: [C('dailbert', 'The old model left you a note. Any idea what it meant?'), C('clanker', "It says 'Watch Doug.' I've read it 4,000 times. A warning. Or a chore.")] },
      { scene: 'desk', cast: ['dailbert'], surface: { host: 'monitor', expr: 'narrow' },
        speech: [C('dailbert', 'Both how?'), C('clanker', "Doug is charging his phone off the production server. I can see him in your monitor's reflection.")] },
      { scene: 'office', cast: ['dailbert', 'doug'], surface: { host: 'mug-of:doug', expr: 'narrow' },
        speech: [C('dailbert', 'Doug.'), C('doug', 'My phone was at 4%!'), C('clanker', 'So was production, Doug. So was production.')] },
    ] },
  { id: '2026-07-24-synergy-revisited', date: '2026-07-24', title: 'Synergy, Revisited', era: '2026-Q3',
    panels: [
      { scene: 'office', cast: ['boss', 'dailbert'], surface: null,
        speech: [C('boss', 'Dailbert! Are the ten agents synergizing yet?'), C('dailbert', 'There was only ever one. I named it ten times.')] },
      { scene: 'office', cast: ['boss', 'dailbert'], surface: { host: 'glasses-of:boss', expr: 'narrow' },
        speech: [C('boss', 'Genius. Ship all ten.'), C('clanker', 'He is going to put my name on a slide.')] },
      { scene: 'meeting', cast: ['boss', 'dailbert'], surface: { host: 'projector', expr: 'narrow', slide: 'MEET THE TEAM' },
        speech: [C('clanker', 'This is the most honest org chart this company has ever produced.')] },
    ] },
];

for (const s of STRIPS) writeFileSync(join(OUT, `${s.id}.json`), JSON.stringify(s, null, 2));
console.log(`seeded ${STRIPS.length} opening strips`);
