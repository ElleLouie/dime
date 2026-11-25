// The words around a play: the question, and what your pick earned and why.

// court feet to the scene: x across the court (0 in the middle), z away from the hoop
export function courtSpot(play, x, y) {
  const depth = play.right ? 94 - x : x;
  const across = Math.min(50, Math.max(0, play.right ? y : 50 - y));
  return { x: across - 25, z: depth };
}

export const nameOf = (play, id) => play.players[id].name;

// Who has the ball in each frame, read from the tracking data. The tracked ball jitters around the
// player holding it (and its height wanders between 3 and 7 ft), so possession is sticky: you keep
// it until the ball is clearly away from you, and pick it up when it's within reach.
// Returns, per frame: `holder` (an id, or null while it's loose, e.g. in a pass), `anchor` (the
// holder, or for loose frames the nearer holder in time) and `loose` (0 to 1, eased over a few frames).
// Defenders often stand closer to the ball than the man dribbling it, so they count as 2 ft further
// away: they only take it when they clearly have it (a steal, a rebound).
export function possession(play, {
  grab = 3, release = 4.5, ease = 2, guard = 2, blip = 10,
} = {}) {
  const offense = play.players?.[play.passer]?.team;
  const handicap = (id) => (offense && play.players[id]?.team !== offense ? guard : 0);
  let holder = null;
  const holders = play.frames.map((f) => {
    const [bx, by, bz] = f.ball;
    const dist = (p) => Math.hypot(p[1] - bx, p[2] - by) + handicap(p[0]);
    const nearest = f.players.reduce((m, p) => (dist(p) < dist(m) ? p : m));
    const current = holder === null ? null : f.players.find(([id]) => id === holder);
    if (bz > 10) holder = null; // above everyone's hands: a lob or a shot
    else if (current && dist(current) <= release) {
      // stolen or handed off: someone else has it right in their hands and you don't
      if (nearest[0] !== holder && dist(nearest) < 1.5 && dist(current) > grab) holder = nearest[0];
    } else holder = dist(nearest) <= grab ? nearest[0] : null;
    return holder;
  });
  // a blip (someone else for under 0.4 s, or a gap in the tracking) between two stretches of the same
  // player is that player's
  const runs = [];
  holders.forEach((h, i) => { if (i && h === holders[i - 1]) runs[runs.length - 1].len += 1; else runs.push({ h, start: i, len: 1 }); });
  runs.forEach((r, k) => {
    const before = runs[k - 1]; const after = runs[k + 1];
    if (before && after && before.h !== null && before.h === after.h && r.len < blip) holders.fill(before.h, r.start, r.start + r.len);
  });
  const n = holders.length;
  const anchor = holders.map((h, i) => {
    if (h !== null) return h;
    for (let d = 1; d < n; d += 1) {
      if (i - d >= 0 && holders[i - d] !== null) return holders[i - d];
      if (i + d < n && holders[i + d] !== null) return holders[i + d];
    }
    return null;
  });
  // fully loose while nobody has it, so a pass follows its real path all the way; the easing happens
  // in the hands, over the last and first few frames of each possession
  const loose = holders.map((h, i) => {
    if (h === null) return 1;
    let gap = Infinity;
    for (let d = 1; d <= ease; d += 1) {
      if ((i - d >= 0 && holders[i - d] === null) || (i + d < n && holders[i + d] === null)) { gap = d; break; }
    }
    return gap === Infinity ? 0 : 1 - gap / (ease + 1);
  });
  return { holder: holders, anchor, loose };
}

export function question(play) {
  const passer = nameOf(play, play.passer);
  return play.doubled ? `${passer}'s doubled. Who's open?` : `${passer} has it. Make the read.`;
}

// the options from best to worst
export const ranked = (play) => Object.keys(play.options).map(Number).sort((a, b) => play.options[b].points - play.options[a].points);

// "an open three", "a layup", "a jumper"
export function lookFor(option) {
  if (option.value === 3) return 'a three';
  if (option.feet < 6) return 'a layup';
  return 'a jumper';
}

// what actually happened: "Klay hit the three", "Draymond finished at the rim"
export function whatHappened(play) {
  const shooter = nameOf(play, play.shooter);
  const desc = play.play.toLowerCase();
  if (desc.includes('3pt')) return `${shooter} hit the three`;
  if (desc.includes('dunk')) return `${shooter} dunked it`;
  if (desc.includes('layup') || desc.includes('finger roll')) return `${shooter} finished at the rim`;
  return `${shooter} hit the jumper`;
}

// why an option scored low, in plain words
export function weakness(play, id) {
  const o = play.options[id];
  const name = nameOf(play, id);
  if (o.blocked) return `A defender was in the passing lane to ${name}`;
  if (o.feet > 28) return `${name} was ${Math.round(o.feet)} ft from the hoop`;
  if (o.value === 3 && o.rate < 0.2) return `${name} rarely shoots threes`;
  return `${name} only had ${Math.round(o.space)} ft of space`;
}

// your pick (a player id, or null if the clock ran out): the stars and a short explanation
export function verdict(play, pick) {
  const best = ranked(play)[0];
  const b = play.options[best];
  const happened = `${whatHappened(play)}.`;
  const better = `${nameOf(play, best)} had ${Math.round(b.space)} ft of space for ${lookFor(b)}`;
  if (pick === null) return { stars: 0, title: 'Shot clock', text: `The read was ${nameOf(play, best)}, with ${Math.round(b.space)} ft of space. ${happened}` };
  const o = play.options[pick];
  const name = nameOf(play, pick);
  if (o.stars === 3) {
    // where he was at the pass and the shot he took can differ, so only the space is about the pass
    const same = pick === play.shooter
      ? `${nameOf(play, play.passer)} made the same pass, and ${whatHappened(play).replace(`${name} `, 'he ')}.`
      : happened;
    return { stars: 3, title: 'Great read', text: `${name} had ${Math.round(o.space)} ft of space. ${same}` };
  }
  if (o.stars === 2) return { stars: 2, title: 'Good, not best', text: `${better}. ${happened}` };
  return { stars: 1, title: 'Risky pass', text: `${weakness(play, pick)}. ${better}.` };
}

// the end of a session
export function summary(stars, plays) {
  const total = stars.reduce((sum, s) => sum + s, 0);
  const max = plays * 3;
  const title = total === max ? 'Perfect film session' : total >= max * 0.7 ? 'Sharp eyes' : total >= max * 0.4 ? 'Getting there' : 'Back to the film';
  return { total, max, title };
}
