import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  courtSpot, possession, question, ranked, lookFor, whatHappened, verdict, summary, weakness,
} from './reads.js';

const play = {
  right: false,
  play: "Thompson 25' 3PT Pullup Jump Shot (13 PTS) (Curry 4 AST)",
  passer: 1, shooter: 2, doubled: true,
  players: { 1: { name: 'Steph' }, 2: { name: 'Klay' }, 3: { name: 'Draymond' }, 4: { name: 'Bogut' } },
  options: {
    2: { feet: 24, space: 14.9, value: 3, blocked: false, points: 1.27, stars: 3 },
    3: { feet: 26, space: 6, value: 3, blocked: true, points: 0.48, stars: 2 },
    4: { feet: 5, space: 2, value: 2, blocked: false, points: 0.3, stars: 1 },
  },
};

test('places court feet on the half court', () => {
  assert.deepEqual(courtSpot(play, 5.25, 25), { x: 0, z: 5.25 });
  assert.deepEqual(courtSpot({ right: true }, 88.75, 0), { x: -25, z: 5.25 });
});

test('asks the question', () => {
  assert.equal(question(play), "Steph's doubled. Who's open?");
  assert.equal(question({ ...play, doubled: false }), 'Steph has it. Make the read.');
});

test('ranks the options', () => {
  assert.deepEqual(ranked(play), [2, 3, 4]);
});

test('names the look', () => {
  assert.equal(lookFor({ value: 3, feet: 24 }), 'a three');
  assert.equal(lookFor({ value: 2, feet: 3 }), 'a layup');
  assert.equal(lookFor({ value: 2, feet: 15 }), 'a jumper');
});

test('says what happened', () => {
  assert.equal(whatHappened(play), 'Klay hit the three');
  assert.equal(whatHappened({ ...play, play: 'Green 2\' Driving Layup (12 PTS)' }), 'Klay finished at the rim');
});

test('scores a pick', () => {
  const great = verdict(play, 2);
  assert.equal(great.stars, 3);
  assert.equal(great.text, 'Klay had 15 ft of space. Steph made the same pass, and he hit the three.');
  assert.equal(verdict(play, 3).stars, 2);
  assert.equal(verdict(play, 4).text, 'Bogut only had 2 ft of space. Klay had 15 ft of space for a three.');
  assert.equal(verdict(play, null).stars, 0);
});

test('explains a weak option', () => {
  const p = { ...play, options: { ...play.options } };
  p.options[4] = { feet: 39, space: 17, value: 3, rate: 0.45, blocked: false };
  assert.equal(weakness(p, 4), 'Bogut was 39 ft from the hoop');
  p.options[4] = { feet: 24, space: 9, value: 3, rate: 0, blocked: false };
  assert.equal(weakness(p, 4), 'Bogut rarely shoots threes');
  p.options[4] = { feet: 24, space: 9, value: 3, rate: 0.4, blocked: true };
  assert.equal(weakness(p, 4), 'A defender was in the passing lane to Bogut');
});

test('sums up a session', () => {
  assert.deepEqual(summary([3, 3, 3, 3, 3], 5), { total: 15, max: 15, title: 'Perfect film session' });
  assert.equal(summary([3, 2, 3, 1, 2], 5).title, 'Sharp eyes');
});

test('possession: sticky while the tracked ball jitters, loose in a pass, picked up on the catch', () => {
  const frame = (ball, a, b) => ({ ball, players: [[1, ...a], [2, ...b]] });
  const p = {
    frames: [
      frame([10, 10, 3], [11, 10], [30, 10]), // 1 has it
      frame([12.5, 11, 6.5], [11, 10], [30, 10]), // jitter, 1.8 ft away and high: still 1's
      frame([10.5, 9, 3.5], [11, 10], [30, 10]),
      frame([18, 10, 6], [11, 10], [30, 10]), // the pass
      frame([24, 10, 6], [11, 10], [30, 10]),
      frame([29, 10, 5], [11, 10], [30, 10]), // 2 catches it
      frame([29.5, 10.5, 4], [11, 10], [30, 10]),
    ],
  };
  const { holder, anchor, loose } = possession(p, { ease: 1 });
  assert.deepEqual(holder, [1, 1, 1, null, null, 2, 2]);
  assert.deepEqual(anchor, [1, 1, 1, 1, 2, 2, 2]);
  assert.equal(loose[0], 0);
  assert.deepEqual(loose.slice(3, 5), [1, 1], 'a pass follows its real path all the way');
  assert.equal(loose[2], 0.5, 'eases out of the hands just before the pass');
  assert.equal(loose[5], 0.5, 'and into them on the catch');
});
