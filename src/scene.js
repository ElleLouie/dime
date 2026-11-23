// The court in 3D: a spotlit half court, sleek players, the ball, and the space around each option.
import * as THREE from 'three';
import { courtSpot, nameOf } from './reads.js';

export const LEMON = '#f7eb4f';
const C = {
  floor: '#1d1d21', boards: 'rgba(255,255,255,0.025)', paint: '#26262b', lines: 'rgba(255,255,255,0.5)', key: 'rgba(247,235,79,0.6)',
  us: '#f4f4f5', them: '#3b3b42', ball: '#e8813a', blocked: '#55555d',
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

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 24), mat(C.ball, 0.25));
  scene.add(ball);
  const lanes = new THREE.Group(); scene.add(lanes);
  const blob = blobTexture();

  let play = null;
  let tokens = {};
  let hits = [];
  let frameIndex = 0;
  let playhead = 0; // a frame number with a fraction: positions are blended between tracking frames
  let ballOverride = null;
  let ballPlaced = false;
  let pickable = [];

  const view = { pos: new THREE.Vector3(0, 90, 100), look: new THREE.Vector3(0, 0, 23) };
  const wanted = { pos: view.pos.clone(), look: view.look.clone() };
  const at = (id, frame = frameIndex) => {
    const p = play.frames[frame].players.find(([pid]) => pid === id);
    const s = courtSpot(play, p[1], p[2]);
    return new THREE.Vector3(s.x, 0, s.z);
  };

  // where everyone is at the playhead, between two 25-a-second tracking frames
  const blend = (a, b, k) => a + (b - a) * k;
  const smooth = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
  function framesAt() {
    const last = play.frames.length - 1;
    const i = Math.min(Math.floor(playhead), last);
    return { f0: play.frames[i], f1: play.frames[Math.min(i + 1, last)], k: Math.min(1, playhead - i) };
  }
  function placePlayers() {
    const { f0, f1, k } = framesAt();
    f0.players.forEach(([id, x, y]) => {
      const n = f1.players.find(([pid]) => pid === id) ?? [id, x, y];
      const s = courtSpot(play, blend(x, n[1], k), blend(y, n[2], k));
      tokens[id]?.root.position.set(s.x, 0, s.z);
    });
  }
  // the ball: dribbled low while it's held, at its real height in the air, blended between the two
  const ballTarget = new THREE.Vector3();
  function ballAt(t) {
    const { f0, f1, k } = framesAt();
    const s = courtSpot(play, blend(f0.ball[0], f1.ball[0], k), blend(f0.ball[1], f1.ball[1], k));
    const z = blend(f0.ball[2], f1.ball[2], k);
    const air = smooth(4.5, 7, z);
    const dribble = 1 + Math.abs(Math.sin(t * 7)) * 2.2;
    return ballTarget.set(s.x + 1.4 * (1 - air), blend(dribble, z, air), s.z + 0.7 * (1 - air));
  }

  // point the camera at an area of the court: as close as the screen's shape allows without cropping it
  function fit(center, halfW, halfD, margin) {
    const tilt = new THREE.Vector3(0, 0.6, 0.8).normalize();
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
    let label = null;
    if (ours) {
      label = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(nameOf(play, id).toUpperCase()), depthTest: false }));
      label.scale.set(10, 2, 1); label.position.y = 12.4; root.add(label);
    }
    const target = new THREE.Mesh(new THREE.SphereGeometry(3.6, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    target.position.y = 3; target.userData.id = id; root.add(target); hits.push(target);
    scene.add(root);
    return { root, body, facing, skin, space, ring, label, size: 0, ringOn: 0, phase: (id % 11) * 0.7 };
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
    view.pos.lerp(wanted.pos, 0.05); view.look.lerp(wanted.look, 0.05);
    camera.position.copy(view.pos); camera.lookAt(view.look);
    Object.values(tokens).forEach((tk) => {
      tk.facing.rotation.y = Math.atan2(camera.position.x - tk.root.position.x, camera.position.z - tk.root.position.z);
      tk.body.position.y = Math.sin(t * 3 + tk.phase) * 0.08;
      const s = tk.space.scale.x + (Math.max(0.001, tk.size) - tk.space.scale.x) * 0.12;
      tk.space.scale.setScalar(s); tk.ring.scale.setScalar(s);
      tk.ring.material.opacity = tk.ringOn * (0.6 + Math.sin(t * 5) * 0.3);
    });
    if (play) {
      placePlayers();
      const target = ballOverride ?? ballAt(t);
      // a jump (a new play, or back from your pass to the real one) glides instead of teleporting
      if (!ballPlaced || ballOverride || ball.position.distanceTo(target) < 3) ball.position.copy(target);
      else ball.position.lerp(target, 1 - Math.exp(-dt * 12));
      ballPlaced = true;
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
      play = next; tokens = {}; hits = []; frameIndex = 0; playhead = 0; ballOverride = null; ballPlaced = false; pickable = [];
      play.frames[0].players.forEach(([id]) => { tokens[id] = figure(id); });
      this.show(0);
      wide();
    },
    // move to a frame; `i` can have a fraction, to land between two frames
    show(i) {
      playhead = Math.min(Math.max(0, i), play.frames.length - 1);
      frameIndex = Math.floor(playhead);
      placePlayers();
    },
    // the decision: push in, show each option's space and lane, and dim the defense
    showOptions() {
      const ids = Object.keys(play.options).map(Number);
      pickable = ids;
      const box = new THREE.Box3().setFromPoints([play.passer, ...ids].map((id) => at(id)));
      const center = box.getCenter(new THREE.Vector3()).setY(0).add(new THREE.Vector3(0, 0, 2));
      fit(center, (box.max.x - box.min.x) / 2, (box.max.z - box.min.z) / 2 + 3, 6);
      const most = Math.max(...ids.map((id) => play.options[id].space));
      ids.forEach((id) => {
        const o = play.options[id];
        const tk = tokens[id];
        tk.size = Math.min(7, Math.max(1.6, o.space * 0.42));
        tk.space.material.opacity = 0.08 + 0.3 * (o.space / most);
        tk.ringOn = 1;
        setLabel(id, `${nameOf(play, id).toUpperCase()} · ${Math.round(o.space)} FT`);
        const a = at(play.passer).setY(0.15); const b = at(id).setY(0.15);
        const lane = new THREE.Mesh(new THREE.PlaneGeometry(0.35, a.distanceTo(b)), new THREE.MeshBasicMaterial({ color: o.blocked ? C.blocked : LEMON, transparent: true, opacity: o.blocked ? 0.5 : 0.85, depthWrite: false }));
        lane.rotation.x = -Math.PI / 2; lane.rotation.z = -Math.atan2(b.x - a.x, b.z - a.z);
        lane.position.copy(a.clone().lerp(b, 0.5)).setY(0.1);
        lanes.add(lane);
      });
      play.frames[frameIndex].players.filter(([id]) => play.players[id].team !== 'GSW').forEach(([id]) => {
        tokens[id].skin.transparent = true; tokens[id].skin.opacity = 0.55;
      });
    },
    clearOptions(keep = null) {
      pickable = [];
      lanes.clear();
      Object.keys(play.options).map(Number).forEach((id) => {
        tokens[id].ringOn = id === keep ? 1 : 0;
        if (id !== keep) tokens[id].size = 0;
        setLabel(id, nameOf(play, id).toUpperCase());
      });
      Object.values(tokens).forEach((tk) => { tk.skin.opacity = 1; tk.skin.transparent = false; });
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
  };
}
