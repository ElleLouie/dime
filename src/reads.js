// The words around a play: the question, and what your pick earned and why.

// court feet to the scene: x across the court (0 in the middle), z away from the hoop
export function courtSpot(play, x, y) {
  const depth = play.right ? 94 - x : x;
  const across = Math.min(50, Math.max(0, play.right ? y : 50 - y));
  return { x: across - 25, z: depth };
}

export const nameOf = (play, id) => play.players[id].name;

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
