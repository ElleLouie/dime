import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './style.css';
import { createCourt } from './scene.js';
import {
  question, verdict, summary, nameOf,
} from './reads.js';

// three stars: earned ones in lemon, the rest dim
const starRow = (n) => [1, 2, 3].map((k) => `<i class="${k <= n ? 'on' : ''}">★</i>`).join('');

const DECIDE_MS = 5000;
const $ = (id) => document.getElementById(id);
const panel = $('panel');
const clockEl = $('clock');

let session = null;
let index = 0;
let stars = [];
let timer = null;
let deciding = false;

const court = createCourt($('stage'), (id) => { if (deciding) choose(id); });

function setPanel(html) {
  panel.classList.remove('on');
  panel.innerHTML = html;
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('on')));
}

function drawBars() {
  $('bars').innerHTML = session.plays.map((_, i) => {
    const cls = i < stars.length ? `s${stars[i]}` : i === index ? 'now' : '';
    return `<li class="${cls}"></li>`;
  }).join('');
}

// play frames from one point to another, 25 a second, with the last half second before the decision in slow motion.
// The playhead moves every screen refresh, so players and the ball glide between tracking frames.
function run(play, from, to, slow, then) {
  let head = from;
  let last = performance.now();
  court.show(head);
  const step = (now) => {
    const dt = Math.min(100, Math.max(0, now - last));
    last = now;
    const slowNow = slow && head >= play.decision - 14;
    head = Math.min(to, head + dt / (slowNow ? 120 : 40));
    court.show(head);
    if (head < to) timer = requestAnimationFrame(step);
    else then();
  };
  timer = requestAnimationFrame(step);
}

function startPlay() {
  const play = session.plays[index];
  cancelAnimationFrame(timer);
  $('big')?.remove();
  court.load(play);
  $('kicker').textContent = `Film session 1 · Play ${index + 1} of ${session.plays.length} · ${play.clock}`;
  $('title').textContent = session.title;
  drawBars();
  setPanel('<p class="ask">Watch the play</p>');
  run(play, 0, play.decision, true, decide);
}

function decide() {
  const play = session.plays[index];
  deciding = true;
  court.showOptions();
  setPanel(`<p class="ask">${question(play)}</p><p class="hint">Tap a teammate to pass. Yellow is open space.</p>`);
  clockEl.classList.add('on');
  const start = performance.now();
  const tick = () => {
    if (!deciding) return;
    const left = Math.max(0, DECIDE_MS - (performance.now() - start));
    clockEl.innerHTML = `<small>DECIDE</small><b>0:0${Math.ceil(left / 1000)}</b>`;
    clockEl.classList.toggle('hurry', left < 2000);
    if (left === 0) choose(null);
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function choose(id) {
  const play = session.plays[index];
  deciding = false;
  clockEl.classList.remove('on', 'hurry');
  panel.classList.remove('on');
  court.clearOptions(id);
  const after = () => finish(play, id);
  if (id === null) after(); else court.pass(id, after);
}

function finish(play, pick) {
  court.wide();
  // then the rest of the real play
  run(play, play.decision, play.end, false, () => {
    court.resetMarks();
    const v = verdict(play, pick);
    stars.push(v.stars);
    drawBars();
    if (v.stars === 3) {
      $('flash').classList.remove('on'); void $('flash').offsetWidth; $('flash').classList.add('on');
      document.body.insertAdjacentHTML('beforeend', '<div class="big" id="big">+3</div>');
    }
    const last = index === session.plays.length - 1;
    setPanel(`<div class="result ${v.stars < 2 ? 'low' : ''}"><h2>${v.title}<span class="stars" aria-label="${v.stars} of 3 stars">${starRow(v.stars)}</span></h2><p>${v.text}</p></div>
      <button type="button" class="go" id="next">${last ? 'See your score' : 'Next play'}</button>`);
    $('next').onclick = () => {
      if (last) showEnd();
      else { index += 1; startPlay(); }
    };
  });
}

function showEnd() {
  const s = summary(stars, session.plays.length);
  $('endTitle').textContent = s.title;
  $('endScore').textContent = `${s.total} / ${s.max}`;
  $('endList').innerHTML = session.plays.map((play, i) => `<li>${nameOf(play, play.passer)} to ${nameOf(play, play.shooter)}
    <span>${play.clock}</span><b class="stars" aria-label="${stars[i]} of 3 stars">${starRow(stars[i])}</b></li>`).join('');
  panel.classList.remove('on');
  $('end').hidden = false;
}

function begin() {
  index = 0;
  stars = [];
  $('start').hidden = true;
  $('end').hidden = true;
  startPlay();
}

async function init() {
  session = await (await fetch(`${import.meta.env.BASE_URL}sessions/christmas-2015.json`)).json();
  await document.fonts.ready;
  $('sessionTitle').textContent = session.title;
  $('sessionGame').textContent = session.game;
  court.load(session.plays[0]);
  $('start').hidden = false;
  $('begin').onclick = begin;
  $('again').onclick = begin;
}

// for automated play-throughs
window.dime = { pick: (id) => deciding && choose(id), screenOf: (id) => court.screenOf(id), ballOf: () => court.ballOf(), ballState: () => court.ballState(), current: () => session.plays[index] };

init();
