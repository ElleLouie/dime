// The court in 3D: a spotlit half court, sleek players, the ball, and the space around each option.
import * as THREE from 'three';
import { courtSpot, nameOf, possession } from './reads.js';

export const LEMON = '#f7eb4f';
const C = {
  floor: '#1d1d21', boards: 'rgba(255,255,255,0.025)', paint: '#26262b', lines: 'rgba(255,255,255,0.5)', key: 'rgba(247,235,79,0.6)',
  us: '#f4f4f5', them: '#3b3b42', dim: '#26262b', ball: '#e8813a', blocked: '#55555d',
};
const FONT = 'Barlow Condensed';

function floorTexture() {
  const c = document.createElement('canvas'); const PX = 20;
  c.width = 54 * PX; c.height = 62 * PX;
  const g = c.getContext('2d');
  g.fillStyle = C.floor; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < c.width; i += 60) { g.fillStyle = C.boards; g.fillRect(i, 0, 30, c.height); }
  const X = (ft) => (ft + 2) * PX; const Z = (ft) => (ft + 2) * PX;
  g.fillStyle = C.paint; g.beginPath(); g.roundRect(X(17), Z(0), 16 * PX, 19 * PX, 4); g.fill();
  g.lineCap = 'round'; g.lineWidth = 5;
  g.strokeStyle = C.key; g.beginPath(); g.roundRect(X(17), Z(0), 16 * PX, 19 * PX, 4); g.stroke();
  g.strokeStyle = C.lines;
  g.beginPath(); g.moveTo(X(3), Z(0)); g.lineTo(X(3), Z(14));
  g.ellipse(X(25), Z(5.25), 23.75 * PX, 23.75 * PX, 0, Math.PI - Math.acos(22 / 23.75), Math.acos(22 / 23.75), true);
  g.lineTo(X(47), Z(0)); g.stroke();
  g.beginPath(); g.moveTo(X(0), Z(47)); g.lineTo(X(50), Z(47)); g.stroke();
  g.beginPath(); g.arc(X(25), Z(47), 6 * PX, 0, Math.PI * 2); g.stroke();
  g.strokeRect(X(0), Z(0), 50 * PX, 58 * PX);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function textTexture(text, { size = 46, color = '#f4f4f5', stroke = '#0d0d0f', w = 320, h = 64 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.font = `700 ${size}px "${FONT}", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (stroke) { g.lineWidth = size / 4; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(text, w / 2, h / 2 + 3); }
  g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const blobTexture = () => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 4, 32, 32, 30);
  r.addColorStop(0, 'rgba(0,0,0,0.6)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
};

// The space map: every spot on the floor, shaded by which team would get there first.
// Lemon where a Warrior is closer, nothing where a defender is; soft at the border.
const MAP = { x0: -27, z0: -2, w: 54, d: 62, px: 4 };
function spaceMap(ours, theirs, options) {
  const c = document.createElement('canvas'); c.width = MAP.w * MAP.px; c.height = MAP.d * MAP.px;
  const g = c.getContext('2d'); const img = g.createImageData(c.width, c.height);
  const near = (list, x, z) => list.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.z - z)), Infinity);
  for (let j = 0; j < c.height; j += 1) {
    for (let i = 0; i < c.width; i += 1) {
      const x = MAP.x0 + (i + 0.5) / MAP.px; const z = MAP.z0 + (j + 0.5) / MAP.px;
      const us = near(ours, x, z); const them = near(theirs, x, z);
      // how far ahead the Warriors are here, softened over a couple of feet
      const k = Math.min(1, Math.max(0, (them - us + 1) / 3));
      // brightest around the options, fading with distance from any Warrior
      const mine = near(options, x, z) <= us + 0.01;
      const a = k * (mine ? 0.45 : 0.2) * Math.max(0, 1 - us / 16);
      const o = (j * c.width + i) * 4;
      img.data[o] = 247; img.data[o + 1] = 235; img.data[o + 2] = 79; img.data[o + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const mat = (color, glow = 0) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, emissive: color, emissiveIntensity: glow });

export function createCourt(stage, onPick) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 500);

  scene.add(new THREE.HemisphereLight('#ffffff', '#202024', 0.9));
  const spot = new THREE.SpotLight('#fff6dc', 3200, 0, 0.75, 0.7, 1.6);
  spot.position.set(0, 70, 24); spot.target.position.set(0, 0, 22);
  scene.add(spot, spot.target);
  const rimLight = new THREE.DirectionalLight('#9fb6ff', 0.6); rimLight.position.set(30, 20, -30); scene.add(rimLight);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(54, 62), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.35, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 29); scene.add(floor);
  const around = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#111114', roughness: 0.9 }));
  around.rotation.x = -Math.PI / 2; around.position.set(0, -0.05, 29); scene.add(around);
  const board = new THREE.Mesh(new THREE.BoxGeometry(7, 4.4, 0.4), mat('#2a2a30'));
  board.position.set(0, 11.5, 0.6); scene.add(board);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.16, 12, 40), mat(C.ball));
  rim.rotation.x = Math.PI / 2; rim.position.set(0, 10, 5.25); scene.add(rim);
  const net = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.7, 1.6, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.7 }));
  net.position.set(0, 9.2, 5.25); scene.add(net);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 11.5, 12), mat('#2a2a30'));
  pole.position.set(0, 5.75, -1.6); scene.add(pole);

  const BALL_R = 1.05;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 24), mat(C.ball, 0.35));
  scene.add(ball);
  // seen through anyone standing in front of it: drawn only where something is closer to the camera
  const ghost = new THREE.Mesh(ball.geometry, new THREE.MeshBasicMaterial({ color: C.ball, transparent: true, opacity: 0.55, depthWrite: false, depthFunc: THREE.GreaterDepth }));
  ghost.renderOrder = 5; ball.add(ghost);
  // its shadow on the floor: sharp and dark when the ball lands, soft and faint when it's high
  const ballShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }));
  ballShadow.rotation.x = -Math.PI / 2; scene.add(ballShadow);
  const lanes = new THREE.Group(); scene.add(lanes);
  const mapMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const map = new THREE.Mesh(new THREE.PlaneGeometry(MAP.w, MAP.d), mapMat);
  map.rotation.x = -Math.PI / 2; map.position.set(MAP.x0 + MAP.w / 2, 0.03, MAP.z0 + MAP.d / 2); map.visible = false; scene.add(map);
  let mapOn = 0;
  // 0: standing figures, 1: flat discs (the whiteboard view at the decision)
  let flat = 0; let flatOn = 0;
  const blob = blobTexture();

  let play = null;
  let tokens = {};
  let hits = [];
  let frameIndex = 0;
  let playhead = 0; // a frame number with a fraction: positions are blended between tracking frames
  let ballOverride = null;
  let ballPlaced = false;
  const ballLag = new THREE.Vector3();
  const lastTarget = new THREE.Vector3();
  let pickable = [];

  const view = { pos: new THREE.Vector3(0, 90, 100), look: new THREE.Vector3(0, 0, 23) };
  const wanted = { pos: view.pos.clone(), look: view.look.clone() };
  const at = (id, frame = frameIndex) => {
    if (frame === frameIndex && tokens[id]) return tokens[id].root.position.clone().setY(0);
    const p = play.frames[frame].players.find(([pid]) => pid === id);
    const s = courtSpot(play, p[1], p[2]);
    return new THREE.Vector3(s.x, 0, s.z);
  };

  // where everyone is at the playhead, between two 25-a-second tracking frames
  const blend = (a, b, k) => a + (b - a) * k;
  function framesAt() {
    const last = play.frames.length - 1;
    const i = Math.min(Math.floor(playhead), last);
    return { f0: play.frames[i], f1: play.frames[Math.min(i + 1, last)], k: Math.min(1, playhead - i) };
  }
  // `dt` eases each figure's nudge (below) in and out over time; without it, the nudge applies at once
  function placePlayers(dt = null) {
    const { f0, f1, k } = framesAt();
    f0.players.forEach(([id, x, y]) => {
      const n = f1.players.find(([pid]) => pid === id) ?? [id, x, y];
      const s = courtSpot(play, blend(x, n[1], k), blend(y, n[2], k));
      tokens[id]?.root.position.set(s.x, 0, s.z);
    });
    const raw = Object.values(tokens).map((tk) => tk.root.position.clone());
    separate();
    // with three players crowded together the nudges can flip from one frame to the next, so they ease
    const ease = dt === null ? 1 : 1 - Math.exp(-dt * 8);
    Object.values(tokens).forEach((tk, i) => {
      tk.nudge.lerp(tk.root.position.clone().sub(raw[i]), ease);
      tk.root.position.copy(raw[i]).add(tk.nudge);
    });
  }
  // bodies are about 3 ft wide and players often stand closer than that: nudge overlapping figures
  // apart, for drawing only, so they never pass through each other
  const GAP = 3.2;
  function separate() {
    const list = Object.values(tokens).map((tk) => tk.root.position);
    for (let pass = 0; pass < 3; pass += 1) {
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const a = list[i]; const b = list[j];
          let dx = b.x - a.x; let dz = b.z - a.z;
          let d = Math.hypot(dx, dz);
          if (d >= GAP) continue;
          if (d < 1e-3) { dx = 1; dz = 0; d = 1; }
          const push = (GAP - d) / 2 / d;
          a.x -= dx * push; a.z -= dz * push; b.x += dx * push; b.z += dz * push;
        }
      }
    }
  }
  // the ball: dribbled at the handler's side while it's held, at its real height in the air, blended between the two
  const ballTarget = new THREE.Vector3();
  const HAND = 5.4; // the top of the dribble, about waist high on the figures
  const BOUNCES = 2.1; // dribbles a second
  let dribbleHeld = 0; // 1 while dribbling, for the squash at the floor
  let dribbleBounce = 1; // 0 at the floor, 1 at the hand
  let owner = null; // possession(play): who has the ball, frame by frame
  const held = new THREE.Vector3();
  function ballAt() {
    const { f0, f1, k } = framesAt();
    const i = Math.min(Math.floor(playhead), play.frames.length - 1);
    const j = Math.min(i + 1, play.frames.length - 1);
    // loose: where the tracking data has it (a pass in flight)
    const s = courtSpot(play, blend(f0.ball[0], f1.ball[0], k), blend(f0.ball[1], f1.ball[1], k));
    const z = blend(f0.ball[2], f1.ball[2], k);
    const air = blend(owner.loose[i], owner.loose[j], k);
    // held: dribbled at the side of whoever has it, ignoring the tracking jitter.
    // Game time, not screen time, so the dribble slows down with the slow motion.
    const p = ((playhead / 25) * BOUNCES) % 1;
    dribbleBounce = 1 - (2 * p - 1) ** 2; // a real dribble falls under gravity: a parabola between floor contacts
    dribbleHeld = (1 - air) * (1 - flat);
    const low = BALL_R + 0.5 * flat; // resting on the disc in the whiteboard view
    const y = low + (HAND - BALL_R) * dribbleBounce * (1 - flat);
    const who = tokens[owner.anchor[k < 0.5 ? i : j]];
    if (!who) return ballTarget.set(s.x, z, s.z);
    const at0 = who.root.position;
    // on the camera's side of the player, a little to the right, so the body never hides it
    const toCam = Math.atan2(camera.position.x - at0.x, camera.position.z - at0.z) + 0.7;
    held.set(at0.x + Math.sin(toCam) * 2.5, y, at0.z + Math.cos(toCam) * 2.5);
    return ballTarget.set(blend(held.x, s.x, air), blend(held.y, z, air), blend(held.z, s.z, air));
  }

  // point the camera at an area of the court: as close as the screen's shape allows without cropping it
  const TV = new THREE.Vector3(0, 0.6, 0.8).normalize();
  const OVERHEAD = new THREE.Vector3(0, 0.96, 0.28).normalize();
  function fit(center, halfW, halfD, margin, tilt = TV) {
    const vf = THREE.MathUtils.degToRad(camera.fov / 2);
    const hf = Math.atan(Math.tan(vf) * camera.aspect);
    const d = Math.max((halfW + margin) / Math.tan(hf), (halfD * tilt.y + margin) / Math.tan(vf), 30);
    wanted.look.copy(center);
    wanted.pos.copy(center).addScaledVector(tilt, d);
  }
  const wide = () => fit(new THREE.Vector3(0, 0, 23), 25, 25, 3);

  function figure(id) {
    const ours = play.players[id].team === 'GSW';
    const root = new THREE.Group();
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05; root.add(shadow);
    const space = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: LEMON, transparent: true, opacity: 0, depthWrite: false }));
    space.rotation.x = -Math.PI / 2; space.position.y = 0.07; root.add(space);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 64), new THREE.MeshBasicMaterial({ color: LEMON, transparent: true, opacity: 0, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; root.add(ring);
    // a slim faceless figure with the number on the chest
    const body = new THREE.Group(); root.add(body);
    const skin = mat(ours ? C.us : C.them);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.95, 3.1, 12, 48), skin); torso.position.y = 3; body.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 40, 28), skin); head.position.y = 6.1; body.add(head);
    const facing = new THREE.Group(); body.add(facing);
    const number = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: textTexture(play.players[id].jersey, { color: ours ? '#0d0d0f' : '#8d8d96', stroke: null, w: 128 }), transparent: true }));
    number.position.set(0, 3.7, 1.0); facing.add(number);
    body.scale.setScalar(1.55);
    // the disc it becomes at the decision, number on top
    const puck = new THREE.Group(); puck.scale.setScalar(0.001); puck.visible = false; root.add(puck);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.5, 48), skin); disc.position.y = 0.25; puck.add(disc);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: textTexture(play.players[id].jersey, { size: 84, color: ours ? '#0d0d0f' : '#9a9aa3', stroke: null, w: 128, h: 128 }), transparent: true, depthWrite: false }));
    top.rotation.x = -Math.PI / 2; top.position.y = 0.52; puck.add(top);
    let label = null;
    if (ours) {
      label = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(nameOf(play, id).toUpperCase()), depthTest: false }));
      label.scale.set(10, 2, 1); label.position.y = 12.4; root.add(label);
    }
    const target = new THREE.Mesh(new THREE.SphereGeometry(3.6, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    target.position.y = 3; target.userData.id = id; root.add(target); hits.push(target);
    scene.add(root);
    return { nudge: new THREE.Vector3(), root, body, puck, facing, skin, base: ours ? C.us : C.them, space, ring, label, size: 0, ringOn: 0, phase: (id % 11) * 0.7 };
  }

  function setLabel(id, text) {
    const tk = tokens[id];
    tk.label.material.map?.dispose();
    tk.label.material.map = textTexture(text);
    tk.label.material.needsUpdate = true;
  }

  // --- the animation loop
  const clock = new THREE.Clock();
  function loop() {
    const dt = Math.min(0.1, clock.getDelta());
    const t = clock.elapsedTime;
    const ease = 1 - Math.exp(-dt * 3); view.pos.lerp(wanted.pos, ease); view.look.lerp(wanted.look, ease);
    camera.position.copy(view.pos); camera.lookAt(view.look);
    flat += (flatOn - flat) * (1 - Math.exp(-dt * 7));
    mapOn += ((flatOn ? 1 : 0) - mapOn) * (1 - Math.exp(-dt * 5));
    mapMat.opacity = mapOn; map.visible = mapOn > 0.01;
    const up = 1 - flat;
    Object.values(tokens).forEach((tk) => {
      tk.body.scale.set(1.55, 1.55 * Math.max(0.001, up), 1.55);
      tk.body.visible = up > 0.15;
      tk.puck.scale.setScalar(Math.max(0.001, flat)); tk.puck.visible = flat > 0.02;
      if (tk.label) tk.label.position.y = 12.4 * up + 4 * flat;
      tk.facing.rotation.y = Math.atan2(camera.position.x - tk.root.position.x, camera.position.z - tk.root.position.z);
      tk.body.position.y = Math.sin(t * 3 + tk.phase) * 0.08 * up;
      const s = tk.space.scale.x + (Math.max(0.001, tk.size) - tk.space.scale.x) * 0.12;
      tk.space.scale.setScalar(s); tk.ring.scale.setScalar(s);
      tk.ring.material.opacity = tk.ringOn * (0.6 + Math.sin(t * 5) * 0.3);
    });
    if (play) {
      placePlayers(dt);
      const target = ballOverride ?? ballAt();
      // The ball moves exactly with what it follows. When that jumps (back to the real play after your
      // pass, or a hitch in the frame rate), the jump becomes an offset that fades out, so it never snaps.
      if (ballPlaced && lastTarget.distanceTo(target) > 2.5) ballLag.add(lastTarget).sub(target);
      ballLag.multiplyScalar(Math.exp(-dt * 9));
      lastTarget.copy(target);
      ball.position.copy(target).add(ballLag);
      ballPlaced = true;
      // a little squash as it hits the floor, so each bounce reads
      const contact = ballOverride ? 0 : dribbleHeld * Math.max(0, 1 - dribbleBounce / 0.12);
      ball.scale.set(1 + 0.12 * contact, 1 - 0.2 * contact, 1 + 0.12 * contact);
      const h = Math.max(0, ball.position.y - BALL_R);
      ballShadow.position.set(ball.position.x, 0.04, ball.position.z);
      ballShadow.scale.setScalar(0.7 + h / 9);
      ballShadow.material.opacity = 0.95 * Math.max(0.15, 1 - h / 10);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    if (!pickable.length) wide();
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  view.pos.copy(wanted.pos); view.look.copy(wanted.look);
  loop();

  // tapping a player
  const ray = new THREE.Raycaster();
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (!pickable.length) return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(hits).find((h) => pickable.includes(h.object.userData.id));
    if (hit) onPick(hit.object.userData.id);
  });

  return {
    load(next) {
      Object.values(tokens).forEach((tk) => scene.remove(tk.root));
      lanes.clear();
      play = next; tokens = {}; hits = []; frameIndex = 0; playhead = 0; ballOverride = null; ballPlaced = false; ballLag.set(0, 0, 0); pickable = [];
      play.frames[0].players.forEach(([id]) => { tokens[id] = figure(id); });
      owner = possession(play);
      this.show(0);
      placePlayers();
      wide();
    },
    // move to a frame; `i` can have a fraction, to land between two frames
    // the figures move there on the next screen refresh (see the loop)
    show(i) {
      playhead = Math.min(Math.max(0, i), play.frames.length - 1);
      frameIndex = Math.floor(playhead);
    },
    // the decision: push in, show each option's space and lane, and dim the defense
    showOptions() {
      const ids = Object.keys(play.options).map(Number);
      pickable = ids;
      const box = new THREE.Box3().setFromPoints([play.passer, ...ids].map((id) => at(id)));
      const center = box.getCenter(new THREE.Vector3()).setY(0).add(new THREE.Vector3(0, 0, 2));
      // room above for the names, which sit on the far side of each disc
      center.z -= 2;
      fit(center, (box.max.x - box.min.x) / 2 + 3, (box.max.z - box.min.z) / 2 + 7, 6, OVERHEAD);
      flatOn = 1;
      const all = play.frames[frameIndex].players.map(([pid]) => pid);
      const where = (list) => list.map((pid) => tokens[pid].root.position.clone());
      mapMat.map?.dispose();
      mapMat.map = spaceMap(where(all.filter((pid) => play.players[pid].team === 'GSW')), where(all.filter((pid) => play.players[pid].team !== 'GSW')), where(ids));
      mapMat.needsUpdate = true;
      ids.forEach((id) => {
        const o = play.options[id];
        const tk = tokens[id];
        tk.size = 2.2; // the ring around the disc; the space itself is on the map
        tk.space.material.opacity = 0;
        tk.ringOn = 1;
        setLabel(id, `${nameOf(play, id).toUpperCase()} · ${Math.round(o.space)} FT`);
        const a = at(play.passer).setY(0.15); const b = at(id).setY(0.15);
        const lane = new THREE.Mesh(new THREE.PlaneGeometry(0.35, a.distanceTo(b)), new THREE.MeshBasicMaterial({ color: o.blocked ? C.blocked : LEMON, transparent: true, opacity: o.blocked ? 0.5 : 0.85, depthWrite: false }));
        lane.rotation.x = -Math.PI / 2; lane.rotation.z = Math.atan2(b.x - a.x, b.z - a.z);
        lane.position.copy(a.clone().lerp(b, 0.5)).setY(0.1);
        lanes.add(lane);
      });
      play.frames[frameIndex].players.filter(([id]) => play.players[id].team !== 'GSW').forEach(([id]) => {
        tokens[id].skin.color.set(C.dim);
      });
    },
    clearOptions(keep = null) {
      pickable = [];
      flatOn = 0;
      lanes.clear();
      Object.keys(play.options).map(Number).forEach((id) => {
        tokens[id].ringOn = id === keep ? 1 : 0;
        if (id !== keep) tokens[id].size = 0;
        setLabel(id, nameOf(play, id).toUpperCase());
      });
      Object.values(tokens).forEach((tk) => tk.skin.color.set(tk.base));
    },
    resetMarks() { Object.values(tokens).forEach((tk) => { tk.ringOn = 0; tk.size = 0; }); },
    // the pass: the ball arcs from the passer to whoever was picked
    pass(id, done) {
      const a = at(play.passer).setY(3); const b = at(id).setY(3);
      const curve = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).setY(9), b);
      const start = performance.now();
      const ms = Math.min(700, 250 + a.distanceTo(b) * 14);
      const fly = (now) => {
        const s = Math.min(1, (now - start) / ms);
        ballOverride = curve.getPoint(1 - (1 - s) ** 2);
        if (s < 1) requestAnimationFrame(fly); else { ballOverride = null; done(); }
      };
      fly(start);
    },
    wide,
    // where a player is on screen, from 0 to 1 (used by tests)
    screenOf(id) { const v = tokens[id].root.position.clone().setY(3).project(camera); return [(v.x + 1) / 2, (1 - v.y) / 2]; },
    ballOf() { return ball.position.toArray(); },
    // what the ball is following right now (used by tests)
    ballState() {
      const i = Math.min(Math.floor(playhead), play.frames.length - 1);
      return { at: ball.position.toArray(), who: owner.anchor[i] && tokens[owner.anchor[i]] ? tokens[owner.anchor[i]].root.position.toArray() : null, cam: camera.position.toArray(), playhead, holder: owner.holder[i], anchor: owner.anchor[i], loose: owner.loose[i], override: Boolean(ballOverride) };
    },
  };
}
