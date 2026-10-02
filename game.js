'use strict';
// ---------- setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1740);
scene.fog = new THREE.Fog(0x1b1740, 40, 120);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
scene.add(new THREE.HemisphereLight(0xbbaaff, 0x332244, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(15, 30, 10); sun.castShadow = true; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.05;
sun.shadow.camera.left = -30; sun.shadow.camera.right = 30; sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
scene.add(sun);

// stage
const STAGE = 13; // half-size
const stage = new THREE.Mesh(new THREE.BoxGeometry(STAGE * 2, 3, STAGE * 2),
  new THREE.MeshStandardMaterial({ color: 0x5b4fa0 }));
stage.position.y = -1.5; stage.receiveShadow = true; scene.add(stage);
const stageTop = new THREE.Mesh(new THREE.BoxGeometry(STAGE * 2 + .2, .2, STAGE * 2 + .2),
  new THREE.MeshStandardMaterial({ color: 0x8f86e0 }));
stageTop.position.y = -0.1; scene.add(stageTop);
const grid = new THREE.GridHelper(STAGE * 2, 13, 0xffffff, 0xffffff);
grid.position.y = 0.01; grid.material.opacity = .15; grid.material.transparent = true; scene.add(grid);
for (let i = 0; i < 80; i++) { // stars
  const s = new THREE.Mesh(new THREE.SphereGeometry(.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  s.position.set((Math.random() - .5) * 200, Math.random() * 60 - 10, (Math.random() - .5) * 200 - 40);
  if (Math.abs(s.position.x) < 30 && Math.abs(s.position.z) < 30) s.position.z -= 60;
  scene.add(s);
}

const GRAV = 34, KO_DIST = 42, KO_FALL = -26;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, o));
const keys = {};
addEventListener('keydown', e => { if (!keys[e.code]) pressed[e.code] = true; keys[e.code] = true; if (e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', e => { keys[e.code] = false; });
const pressed = {};

let camYaw = 0; // camera orbit
const fighters = [], projectiles = [], effects = [];

// ---------- models ----------
function box(w, h, d, c, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}
function cyl(rt, rb, h, c, x, y, z, parent, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}
function sph(r, c, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(c)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}
function makeHat() {
  const g = new THREE.Group();
  cyl(.45, .45, .08, 0x2a1450, 0, 0.04, 0, g); cyl(.28, .28, .5, 0x2a1450, 0, 0.33, 0, g);
  cyl(.285, .285, .1, 0xff4fd8, 0, 0.18, 0, g); return g;
}
function buildMai() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  cyl(.35, .5, 1.0, 0x8a3fd1, 0, .75, 0, body);                  // dress
  sph(.3, 0xf2d3c4, 0, 1.5, 0, body);                            // head
  box(.5, .2, .1, 0xffffff, 0, 1.52, .26, body);                 // mask
  box(.12, .06, .02, 0x111111, -.12, 1.53, .32, body); box(.12, .06, .02, 0x111111, .12, 1.53, .32, body);
  const hat = makeHat(); hat.position.y = 1.7; body.add(hat);
  for (const s of [-1, 1]) {                                     // bunny ears
    const e = cyl(.07, .09, .8, 0xc79bf0, s * .17, 2.45, 0, body); e.rotation.z = -s * .15;
    const i = cyl(.03, .05, .6, 0xff9ee8, s * .17, 2.45, .05, body); i.rotation.z = -s * .15;
  }
  box(.12, .6, .12, 0x8a3fd1, -.45, 1.0, 0, body); const arm = box(.12, .6, .12, 0x8a3fd1, .45, 1.0, 0, body);
  const sword = new THREE.Group(); sword.position.set(.45, 1.0, .1); body.add(sword);
  box(.08, 1.1, .04, 0xdddddd, 0, .6, 0, sword); box(.3, .06, .08, 0xffd54a, 0, .05, 0, sword);
  return { g, body, sword, arm };
}
function buildBrave() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  box(.8, 1.0, .5, 0x2b2b30, 0, 1.0, 0, body);                   // armor torso
  box(.95, .25, .6, 0x44444c, 0, 1.45, 0, body);                 // pauldrons
  box(.3, .7, .3, 0x1d1d22, -.22, .35, 0, body); box(.3, .7, .3, 0x1d1d22, .22, .35, 0, body);
  sph(.3, 0x3a3a42, 0, 1.85, 0, body);                           // helmet
  box(.5, .16, .1, 0x111111, 0, 1.85, .27, body);                // visor slit
  box(.1, .08, .06, 0xff1010, -.12, 1.85, .33, body).material.emissive = new THREE.Color(0xff0000);
  box(.1, .08, .06, 0xff1010, .12, 1.85, .33, body).material.emissive = new THREE.Color(0xff0000);
  box(.28, .8, .28, 0x2b2b30, -.6, 1.0, 0, body); box(.28, .8, .28, 0x2b2b30, .6, 1.0, 0, body);
  box(.9, .15, .1, 0x7a0e0e, 0, 1.0, .27, body);                 // red sash
  const sword = new THREE.Group(); sword.position.set(.6, 1.0, .2); body.add(sword);
  box(.55, 2.6, .1, 0xb8b8c4, 0, 1.6, 0, sword);                 // HUGE wide blade
  box(.8, .14, .2, 0x222222, 0, .25, 0, sword); box(.14, .5, .14, 0x4a2a10, 0, 0, 0, sword);
  return { g, body, sword };
}

// ---------- fighter ----------
class Fighter {
  constructor(kind, spawn, human) {
    this.kind = kind; this.human = human; this.spawn = spawn.clone();
    const m = kind === 'mai' ? buildMai() : buildBrave();
    this.mesh = m.g; this.body = m.body; this.swordM = m.sword; scene.add(this.mesh);
    this.mats = []; this.mesh.traverse(o => { if (o.material) { o.material.transparent = true; this.mats.push(o.material); } });
    this.name = kind.toUpperCase(); this.stocks = 3; this.reset();
    this.reach = kind === 'brave' ? 3.1 : 2.0;
    this.swordDmg = kind === 'brave' ? 9 : 5; this.swordKB = kind === 'brave' ? 15 : 11;
    this.cd = { k: 0, l: 0, u: 0, i: 0, sword: 0, dash: 0 };
    this.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0x4fc3ff, transparent: true, opacity: .35 }));
    this.shieldMesh.visible = false; scene.add(this.shieldMesh);
  }
  reset() {
    this.pos = this.spawn.clone().add(V(0, 6, 0)); this.vel = V(); this.mult = 1.0;
    this.facing = V(0, 0, this.spawn.z > 0 ? -1 : 1); this.onGround = false; this.energy = 100; this.dashT = 0;
    this.stun = 0; this.hitstun = 0; this.invuln = 2; this.act = null; this.shield = 100; this.shielding = false;
    this.shieldBroken = 0; this.invis = 0; this.hat = null; this.card = null; this.swing = 0; this.alive = true;
    this.chainStunned = 0; this.spin = 0;
  }
  get center() { return this.pos.clone().add(V(0, 1, 0)); }
  get busy() { return this.stun > 0 || this.hitstun > 0 || this.act || this.shieldBroken > 0; }
  canAct() { return !this.busy && this.alive; }

  // damage / knockback
  hit(att, dmg, kb, dir, opts = {}) {
    if (this.invuln > 0 || !this.alive) return false;
    if (this.shielding && this.shield > 0 && !opts.unblockable) {
      this.shield -= dmg * 1.4 + 2;
      this.vel.addScaledVector(dir, 3);
      if (this.shield <= 0) { this.shield = 0; this.shieldBroken = 2.5; this.shielding = false; spawnBurst(this.center, 0x4fc3ff, 20); }
      spawnBurst(this.center, 0x9fe0ff, 5);
      return true;
    }
    this.mult += dmg / 100;
    const speed = kb * (0.5 + this.mult * 0.6);
    this.vel.set(dir.x * speed, Math.max(dir.y, 0.35) * speed * (opts.flat ? 0.4 : 1) + (opts.up || 0), dir.z * speed);
    this.hitstun = Math.min(0.15 + speed * 0.012, 0.9);
    this.onGround = false; this.act = null; this.shielding = false;
    spawnBurst(this.center, 0xffe066, 10);
    return true;
  }

  // ----- actions -----
  startAct(name, dur, update, end) { this.act = { name, t: 0, dur, update, end }; }
  sword() {
    if (!this.canAct() || this.cd.sword > 0) return;
    this.cd.sword = this.kind === 'brave' ? 0.65 : 0.4; this.swing = 0.3; let hitDone = false;
    this.startAct('sword', 0.3, (dt, a) => {
      if (!hitDone && a.t > 0.1) { hitDone = true; meleeBox(this, this.reach, 1.4, this.swordDmg, this.swordKB, 0.7); }
    });
  }
  useAbility(slot) {
    if (!this.alive || this.stun > 0 || this.hitstun > 0 || this.shieldBroken > 0) return;
    const A = ABILITIES[this.kind][slot]; if (!A) return;
    const free = (slot === 'u' && this.kind === 'mai' && this.hat) || (slot === 'i' && this.kind === 'mai' && this.card);
    const cost = free ? 0 : COST[this.kind][slot];
    if (this.energy < cost) return;
    const cd0 = this.cd[slot], hat0 = this.hat, card0 = this.card;
    A(this);
    if (!free && (this.cd[slot] > cd0 || this.hat !== hat0 || this.card !== card0)) this.energy -= cost;
  }
}

// melee check: sphere in front of attacker
function meleeBox(att, reach, rad, dmg, kb, upk) {
  const foe = other(att); if (!foe) return;
  const c = att.pos.clone().add(V(0, 1, 0)).addScaledVector(att.facing, reach * 0.55);
  const t = foe.center; const hitR = rad + (att.kind === 'brave' ? 1.0 : 0.3) + 0.6;
  if (c.distanceTo(t) < hitR + (reach * 0.35)) {
    const d = t.clone().sub(att.pos).setY(0).normalize().lerp(att.facing, 0.4).normalize(); d.y = upk;
    foe.hit(att, dmg, kb, d.normalize());
  }
  effects.push(slash(att, reach));
}
function other(f) { return fighters.find(x => x !== f); }
function slash(att, reach) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(reach * .6, .06, 6, 20, Math.PI),
    new THREE.MeshBasicMaterial({ color: att.kind === 'brave' ? 0xff6b3a : 0xe8b4ff, transparent: true }));
  m.position.copy(att.pos).add(V(0, 1.1, 0)).addScaledVector(att.facing, .6);
  m.rotation.set(Math.PI / 2, 0, Math.atan2(att.facing.x, att.facing.z) * -1 + Math.PI / 2 * 0);
  m.lookAt(m.position.clone().add(att.facing)); m.rotateX(Math.PI / 2);
  scene.add(m); return { mesh: m, life: .18, max: .18, grow: 1.2 };
}
function spawnBurst(p, color, n) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(.09), new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.position.copy(p); scene.add(m);
    effects.push({ mesh: m, life: .5, max: .5, vel: V((Math.random() - .5) * 8, Math.random() * 6, (Math.random() - .5) * 8) });
  }
}
function ring(p, r, color) {
  const m = new THREE.Mesh(new THREE.RingGeometry(.3, .5, 32), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.copy(p).setY(.1); scene.add(m);
  effects.push({ mesh: m, life: .35, max: .35, grow: r * 2 });
}

// projectiles
function addProj(o) { o.mesh.position.copy(o.pos); scene.add(o.mesh); projectiles.push(o); return o; }
function removeProj(p) { scene.remove(p.mesh); if (p.link) scene.remove(p.link); projectiles.splice(projectiles.indexOf(p), 1); }

// ---------- abilities ----------
const COST = { mai: { k: 25, l: 30, u: 15, i: 20 }, brave: { k: 20, l: 30, u: 25, i: 15 } };
const JUMP_COST = 10, DASH_COST = 15, ENERGY_REGEN = 25;
const ABILITIES = {
  mai: {
    k(f) { // spinning attack
      if (f.cd.k > 0) return; f.cd.k = 2.5; let n = 0;
      f.startAct('spin', 0.9, (dt, a) => {
        f.body.rotation.y += dt * 25; f.vel.x *= 0.98; f.vel.z *= 0.98;
        if (a.t > n * 0.2 + 0.1) {
          n++; const foe = other(f), d = foe.center.clone().sub(f.center);
          if (d.length() < 2.8) { d.y = 0; d.normalize(); d.y = 0.6; foe.hit(f, n < 4 ? 3 : 5, n < 4 ? 6 : 15, d.normalize()); }
          ring(f.pos, 1.4, 0xd18bff);
        }
      }, () => { f.body.rotation.y = 0; });
    },
    l(f) { // invisibility
      if (f.cd.l > 0) return; f.cd.l = 9; f.invis = 4; spawnBurst(f.center, 0xd18bff, 14);
    },
    u(f) { // hat drop / teleport
      if (f.hat) {
        const p = f.hat.pos.clone(); scene.remove(f.hat.mesh); f.hat = null; spawnBurst(f.center, 0xff4fd8, 12);
        f.pos.copy(p); f.vel.set(0, 0, 0); f.cd.u = 1.5; spawnBurst(f.center, 0xff4fd8, 12); return;
      }
      if (f.cd.u > 0) return;
      const mesh = makeHat(); const pos = f.pos.clone().addScaledVector(f.facing, 1.2);
      mesh.position.copy(pos); scene.add(mesh); f.hat = { mesh, pos, vy: 4, t: 10 };
    },
    i(f) { // card
      if (f.card) { // teleport to stuck target
        const c = f.card; if (c.target) {
          const t = c.target; const dest = t.pos.clone().addScaledVector(t.facing, -1.3);
          scene.remove(c.mesh); f.card = null; spawnBurst(f.center, 0xff4fd8, 12);
          f.pos.copy(dest); f.vel.set(0, 2, 0); f.facing.copy(t.facing); f.cd.i = 3; spawnBurst(f.center, 0xff4fd8, 12);
          const d = t.facing.clone().multiplyScalar(0.8); d.y = 0.6; t.hit(f, 7, 10, d.normalize());
        } return;
      }
      if (f.cd.i > 0) return; f.cd.i = 1;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(.5, .75, .03), mat(0xffffff, { emissive: 0xff4fd8, emissiveIntensity: .6 }));
      const p = addProj({ owner: f, type: 'card', mesh, pos: f.pos.clone().add(V(0, 1.1, 0)).addScaledVector(f.facing, .8),
        vel: f.facing.clone().multiplyScalar(30), life: 1.2, r: .8 });
      f.card = p;
    }
  },
  brave: {
    k(f) { // chain
      if (f.cd.k > 0) return; f.cd.k = 4; f.startAct('chain', 0.45, () => { });
      const link = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1, 6), mat(0x999999)); scene.add(link);
      addProj({ owner: f, type: 'chain', mesh: sph(.2, 0xcccccc, 0, 0, 0, new THREE.Group()), link, pos: f.pos.clone().add(V(0, 1.2, 0)),
        vel: f.facing.clone().multiplyScalar(45), life: .45, r: 1.1 });
    },
    l(f) { // jump up & slam
      if (f.cd.l > 0) return; f.cd.l = 6; f.vel.set(0, 24, 0); f.onGround = false; let slamming = false;
      f.startAct('slam', 3, (dt, a) => {
        if (!slamming && (a.t > 0.55)) { slamming = true; f.vel.set(0, -48, 0); }
        if (slamming && f.onGround) {
          ring(f.pos, 4.5, 0xff7733); spawnBurst(f.pos, 0xff7733, 24);
          const foe = other(f), d = foe.pos.clone().sub(f.pos); d.y = 0;
          if (d.length() < 4.5 && foe.pos.y < 2.5) { d.normalize(); d.y = 1.0; foe.hit(f, 13, 19, d.normalize()); }
          f.act = null;
        }
      });
    },
    u(f) { // thrust
      if (f.cd.u > 0) return; f.cd.u = 5; let did = false;
      f.startAct('thrust', 0.7, (dt, a) => {
        if (a.t < .25) { f.vel.x = f.vel.z = 0; f.body.rotation.x = -.3; return; }
        if (a.t < .5) {
          f.vel.x = f.facing.x * 34; f.vel.z = f.facing.z * 34;
          const foe = other(f);
          if (!did && foe.center.distanceTo(f.center.clone().addScaledVector(f.facing, 1.3)) < 2.3) {
            did = true; const d = f.facing.clone(); d.y = 0.25; foe.hit(f, 16, 28, d.normalize()); spawnBurst(foe.center, 0xff3333, 18);
          }
        } else { f.vel.x *= .8; f.vel.z *= .8; }
      }, () => { f.body.rotation.x = 0; });
    },
    i(f) { // fireball
      if (f.cd.i > 0) return; f.cd.i = 1.4;
      const m = new THREE.Mesh(new THREE.SphereGeometry(.45, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
      addProj({ owner: f, type: 'fire', mesh: m, pos: f.pos.clone().add(V(0, 1.2, 0)).addScaledVector(f.facing, 1.2),
        vel: f.facing.clone().multiplyScalar(24), life: 2.5, r: .9 });
    }
  }
};
ABILITIES.mai.k.meta = 1;

// ---------- simulation ----------
let state = 'menu', player, bot, aiT = 0, shake = 0;

function updateProjectiles(dt) {
  for (const p of projectiles.slice()) {
    p.life -= dt; p.pos.addScaledVector(p.vel, dt); p.mesh.position.copy(p.pos);
    const foe = other(p.owner);
    if (p.type === 'card' && p.target) { // stuck
      p.pos.copy(p.target.center).add(V(0, .6, 0)); p.mesh.position.copy(p.pos); p.mesh.rotation.y += dt * 3;
      if (p.life2 !== undefined && (p.life2 -= dt) < 0 || !p.target.alive) { scene.remove(p.mesh); if (p.owner.card === p) p.owner.card = null; projectiles.splice(projectiles.indexOf(p), 1); }
      continue;
    }
    if (p.type === 'card') p.mesh.rotation.y += dt * 20;
    if (p.type === 'chain') {
      const a = p.owner.pos.clone().add(V(0, 1.2, 0)), d = p.pos.clone().sub(a), len = d.length();
      p.link.position.copy(a).addScaledVector(d, .5); p.link.scale.set(1, Math.max(len, .01), 1);
      p.link.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
    }
    if (foe && foe.alive && p.pos.distanceTo(foe.center) < p.r + .6 && foe.invuln <= 0) {
      if (p.type === 'fire') {
        const d = p.vel.clone().normalize(); d.y = 0.3; foe.hit(p.owner, 8, 13, d.normalize()); spawnBurst(p.pos, 0xff7a1a, 14); removeProj(p); continue;
      }
      if (p.type === 'chain') {
        if (foe.shielding && foe.shield > 0) foe.hit(p.owner, 4, 0, p.vel.clone().normalize());
        else { foe.stun = 1.8; foe.act = null; foe.vel.set(0, 0, 0); foe.mult += .02; spawnBurst(foe.center, 0xcccccc, 12);
          foe.stunChainOwner = p.owner; p.owner.chainTarget = { foe, t: 1.8 }; }
        removeProj(p); continue;
      }
      if (p.type === 'card') {
        foe.mult += 0.03; p.target = foe; p.life2 = 6; p.vel.set(0, 0, 0); spawnBurst(p.pos, 0xff4fd8, 8); continue;
      }
    }
    if (p.life <= 0 || Math.abs(p.pos.x) > 80 || Math.abs(p.pos.z) > 80) {
      if (p.type === 'card' && p.owner.card === p) p.owner.card = null;
      removeProj(p);
    }
  }
}

function controls(f, dt) {
  const k = keys, pr = pressed;
  const fwd = V(-Math.sin(camYaw), 0, -Math.cos(camYaw)), right = V(Math.cos(camYaw), 0, -Math.sin(camYaw));
  const mv = V();
  if (k.KeyW) mv.add(fwd); if (k.KeyS) mv.sub(fwd); if (k.KeyD) mv.add(right); if (k.KeyA) mv.sub(right);
  const want = { mv, jump: pr.Space, shield: k.ShiftLeft || k.ShiftRight, sword: pr.KeyJ, dash: pr.KeyC, k: pr.KeyK, l: pr.KeyL, u: pr.KeyU, i: pr.KeyI };
  return want;
}

function aiControls(f, dt) {
  const foe = other(f), want = { mv: V(), shield: false }; if (!foe.alive) return want;
  const to = foe.pos.clone().sub(f.pos); to.y = 0; const dist = to.length(); to.normalize();
  f.ai = f.ai || { t: 0, shieldT: 0 };
  // recovery
  const off = Math.max(Math.abs(f.pos.x), Math.abs(f.pos.z)) > STAGE - 0.5 || f.pos.y < -1;
  if (off && f.pos.y < 1.5) {
    want.mv = f.pos.clone().multiplyScalar(-1).setY(0).normalize();
    if (f.vel.y < 2 && f.energy > JUMP_COST && Math.random() < .08) want.jump = true;
    if (f.kind === 'brave' && f.pos.y < -3) want.l = false;
    return want;
  }
  f.ai.t -= dt; f.ai.shieldT -= dt;
  const nearEdge = Math.max(Math.abs(f.pos.x), Math.abs(f.pos.z)) > STAGE - 2;
  if (nearEdge) want.mv = f.pos.clone().multiplyScalar(-1).setY(0).normalize();
  else if (dist > (f.kind === 'brave' ? 3 : 2)) want.mv = to.clone();
  else if (dist < 1.2) want.mv = to.clone().multiplyScalar(-.5);
  if (f.ai.shieldT > 0) want.shield = true;
  if (foe.act && foe.act.name !== 'sword' && dist < 4 && Math.random() < .02) f.ai.shieldT = .8;
  if (f.ai.t <= 0) {
    f.ai.t = .5 + Math.random() * .6; f.facing.copy(to);
    const r = Math.random();
    if (dist < f.reach + .6) { if (r < .55) want.sword = true; else if (r < .7) want.k = true; else if (r < .8) want.u = true; else if (r < .88) f.ai.shieldT = .7; }
    else if (dist < 9) { if (r < .35) want.i = true; else if (r < .5) want.k = true; else if (r < .6) want.l = true; else if (r < .7) want.u = true; }
    else if (r < .3) want.i = true;
    if (f.kind === 'mai' && f.card && f.card.target && Math.random() < .5) want.i = true;
    if (f.kind === 'mai' && f.hat && Math.random() < .3) want.u = true;
  }
  return want;
}

function stepFighter(f, dt) {
  if (!f.alive) return;
  for (const c in f.cd) f.cd[c] = Math.max(0, f.cd[c] - dt);
  f.invuln = Math.max(0, f.invuln - dt); f.stun = Math.max(0, f.stun - dt); f.hitstun = Math.max(0, f.hitstun - dt);
  f.swing = Math.max(0, f.swing - dt); f.invis = Math.max(0, f.invis - dt);
  if (f.shieldBroken > 0) { f.shieldBroken -= dt; if (f.shieldBroken <= 0) f.shield = 40; }
  const want = f.human ? controls(f, dt) : aiControls(f, dt);

  // shield
  if (f.onGround && f.hitstun <= 0) f.energy = Math.min(100, f.energy + ENERGY_REGEN * dt); // ground-only regen
  f.dashT = Math.max(0, f.dashT - dt);
  f.shielding = !!want.shield && f.shieldBroken <= 0 && f.shield > 0 && !f.act && f.stun <= 0 && f.hitstun <= 0 && f.onGround;
  if (f.shielding) f.shield = Math.max(0, f.shield - 7 * dt); else if (f.shieldBroken <= 0) f.shield = Math.min(100, f.shield + 12 * dt);
  if (f.shield <= 0 && f.shielding) { f.shieldBroken = 2.5; f.shielding = false; }

  // actions
  if (f.canAct() && !f.shielding) {
    if (want.sword) f.sword();
    for (const s of ['k', 'l', 'u', 'i']) if (want[s]) f.useAbility(s);
  } else if (f.alive && f.stun <= 0 && f.hitstun <= 0 && f.shieldBroken <= 0) {
    // allow re-press abilities (teleports) mid-action
    if (want.u && f.kind === 'mai' && f.hat) f.useAbility('u');
    if (want.i && f.kind === 'mai' && f.card && f.card.target) f.useAbility('i');
  }

  // act update
  if (f.act) { f.act.t += dt; if (f.act.update) f.act.update(dt, f.act); if (f.act && f.act.t >= f.act.dur) { const a = f.act; f.act = null; a.end && a.end(); } }

  // movement
  const free = !f.act && f.stun <= 0 && f.hitstun <= 0 && f.shieldBroken <= 0 && !f.shielding;
  const free2 = f.act && f.act.name !== 'thrust' && f.act.name !== 'slam' && f.act.name !== 'spin' && f.hitstun <= 0 && f.stun <= 0 && f.act.name !== 'chain';
  if (f.dashT > 0) { /* dashing: keep velocity */ }
  else if ((free || free2) && want.mv.lengthSq() > 0) {
    const m = want.mv.clone().normalize(); const sp = 9 * (free2 ? .5 : 1);
    const ctrl = f.onGround ? 1 : 0.25;
    f.vel.x += (m.x * sp - f.vel.x) * Math.min(1, 12 * dt * ctrl); f.vel.z += (m.z * sp - f.vel.z) * Math.min(1, 12 * dt * ctrl);
    if (!f.act) f.facing.copy(m);
  } else if (f.onGround && f.hitstun <= 0 && !(f.act && (f.act.name === 'thrust'))) {
    const fr = Math.max(0, 1 - 12 * dt); f.vel.x *= fr; f.vel.z *= fr;
  }
  if (f.human && f.canAct()) { // face foe when no movement for attacks
    const foe = other(f);
    if (foe && want.mv.lengthSq() === 0 && (want.sword || want.k || want.l || want.u || want.i)) f.facing.copy(foe.pos.clone().sub(f.pos).setY(0).normalize());
  }
  if (want.dash && (free || free2) && f.energy >= DASH_COST && f.cd.dash <= 0) {
    const d = want.mv.lengthSq() > 0 ? want.mv.clone().normalize() : f.facing.clone();
    f.vel.x = d.x * 26; f.vel.z = d.z * 26; if (!f.onGround) f.vel.y = Math.max(f.vel.y, 2);
    f.dashT = 0.2; f.cd.dash = 0.45; f.energy -= DASH_COST; f.facing.copy(d); spawnBurst(f.pos.clone().add(V(0, 1, 0)), 0xffffff, 8);
  }
  if (want.jump && (free || free2) && (f.onGround || f.energy >= JUMP_COST)) { f.vel.y = f.onGround ? 14 : 13; if (!f.onGround) f.energy -= JUMP_COST; f.onGround = false; spawnBurst(f.pos, 0xffffff, 4); }

  // physics
  if (!(f.stun > 0)) f.vel.y -= GRAV * dt; else f.vel.y = Math.max(f.vel.y - GRAV * dt, -2) * 0 ;
  if (f.stun > 0) { f.vel.x = 0; f.vel.z = 0; }
  f.pos.addScaledVector(f.vel, dt);
  const onStage = Math.abs(f.pos.x) < STAGE && Math.abs(f.pos.z) < STAGE;
  if (onStage && f.pos.y <= 0 && f.pos.y > -1.2 && f.vel.y <= 0) { f.pos.y = 0; f.vel.y = 0; f.onGround = true; }
  else f.onGround = false;
  if (!onStage && f.pos.y < 0 && f.pos.y > -3 && (Math.abs(f.pos.x) < STAGE + .4 && Math.abs(f.pos.z) < STAGE + .4)) { /* ledge lip */ }
  // wall of stage side
  if (f.pos.y < 0 && f.pos.y > -3 && onStage === false) {
    // collide with stage side if below top
    const ox = Math.abs(f.pos.x) - STAGE, oz = Math.abs(f.pos.z) - STAGE;
    if (ox < .5 && oz < .5) { if (ox > oz) f.pos.x = Math.sign(f.pos.x) * (STAGE + .5); else f.pos.z = Math.sign(f.pos.z) * (STAGE + .5); f.vel.x *= -.2; f.vel.z *= -.2; }
  }
  // chain pull
  if (f.chainTarget) {
    const ct = f.chainTarget; ct.t -= dt;
    if (ct.t <= 0 || ct.foe.stun <= 0) f.chainTarget = null;
    else { const d = f.pos.clone().sub(ct.foe.pos); d.y = 0; if (d.length() > 2.4) ct.foe.pos.addScaledVector(d.normalize(), 6 * dt); }
  }
  // hat physics
  if (f.hat) { const h = f.hat; h.vy -= 30 * dt; h.pos.y += h.vy * dt; h.pos.addScaledVector(f.facing, 0); if (h.pos.y < 0) { h.pos.y = 0; h.vy = 0; } h.mesh.position.copy(h.pos); h.mesh.rotation.y += dt; h.t -= dt; if (h.t <= 0) { scene.remove(h.mesh); f.hat = null; } }

  // KO
  const dxz = Math.hypot(f.pos.x, f.pos.z);
  if (f.pos.y < KO_FALL || dxz > KO_DIST || f.pos.y > 60) ko(f);
}

function ko(f) {
  f.stocks--; spawnBurst(f.pos.clone().clamp(V(-30, -10, -30), V(30, 30, 30)), 0xffffff, 30); shake = .6;
  if (f.hat) { scene.remove(f.hat.mesh); f.hat = null; }
  projectiles.slice().forEach(p => { if (p.owner === f || p.target === f) { if (p.owner.card === p) p.owner.card = null; removeProj(p); } });
  if (f.stocks <= 0) { f.alive = false; f.mesh.visible = false; f.shieldMesh.visible = false; endGame(f === player ? 'bot' : 'player'); return; }
  const stocks = f.stocks; f.reset(); f.stocks = stocks; setMsg(f.name + ' KO!', 1.5);
}

function render(dt) {
  for (const f of fighters) {
    if (!f.alive) continue;
    f.mesh.position.copy(f.pos);
    if (!f.act || f.act.name !== 'spin') f.mesh.rotation.y = Math.atan2(f.facing.x, f.facing.z);
    // invisibility
    let a = 1; if (f.invis > 0) a = (f === player) ? 0.25 : 0.0;
    if (f.invuln > 0 && Math.floor(f.invuln * 10) % 2) a *= .4;
    f.mats.forEach(m => m.opacity = a); f.mesh.visible = a > 0.01;
    // sword anim
    const sw = f.swing > 0 ? (1 - f.swing / .3) : 0;
    f.swordM.rotation.x = f.swing > 0 ? -2.2 + sw * 3.8 : -0.3;
    if (f.act && f.act.name === 'thrust') f.swordM.rotation.x = -1.57;
    if (f.act && f.act.name === 'slam') f.swordM.rotation.x = 2.8;
    f.mesh.scale.y = f.stun > 0 ? .9 : 1;
    // shield bubble
    f.shieldMesh.visible = f.shielding;
    if (f.shielding) { const s = .6 + f.shield / 100 * .9; f.shieldMesh.scale.setScalar(s * 1.1); f.shieldMesh.position.copy(f.pos).add(V(0, 1.1, 0));
      f.shieldMesh.material.color.setHSL(.55 - (1 - f.shield / 100) * .55, 1, .6); }
    if (f.stun > 0) f.body.rotation.z = Math.sin(performance.now() / 40) * .1; else f.body.rotation.z = 0;
  }
  for (const e of effects.slice()) {
    e.life -= dt; const k = Math.max(0, e.life / e.max);
    if (e.vel) { e.mesh.position.addScaledVector(e.vel, dt); e.vel.y -= 15 * dt; }
    if (e.grow) e.mesh.scale.setScalar(1 + (1 - k) * e.grow);
    e.mesh.material.opacity = k;
    if (e.life <= 0) { scene.remove(e.mesh); effects.splice(effects.indexOf(e), 1); }
  }
  // camera
  const mid = V(); let n = 0; fighters.forEach(f => { if (f.alive) { mid.add(f.pos); n++; } }); mid.multiplyScalar(1 / Math.max(n, 1));
  const span = fighters.length > 1 ? fighters[0].pos.distanceTo(fighters[1].pos) : 0;
  const dist = Math.min(34, 9 + span * .7);
  const tgt = V(mid.x + Math.sin(camYaw) * dist, 8 + dist * .35, mid.z + Math.cos(camYaw) * dist);
  camera.position.lerp(tgt, Math.min(1, 6 * dt));
  if (shake > 0) { camera.position.add(V((Math.random() - .5) * shake, (Math.random() - .5) * shake, 0)); shake -= dt; }
  camera.lookAt(mid.x, mid.y + 1.5, mid.z);
  hud();
}

// ---------- HUD ----------
let msgT = 0; function setMsg(t, s) { document.getElementById('msg').textContent = t; msgT = s; }
const NAMES = { k: 'K', l: 'L', u: 'U', i: 'I' };
const ABNAME = { mai: { k: 'Spin', l: 'Invis', u: 'Hat', i: 'Card' }, brave: { k: 'Chain', l: 'Slam', u: 'Thrust', i: 'Fireball' } };
function hud() {
  [player, bot].forEach((f, i) => {
    if (!f) return;
    const cds = ['k', 'l', 'u', 'i'].map(s => `${NAMES[s]}:${ABNAME[f.kind][s]} ${f.cd[s] > 0 ? f.cd[s].toFixed(1) + 's' : '✔'}`).join(' · ');
    document.getElementById('p' + (i + 1)).innerHTML =
      `<div class="name">${i ? 'CPU ' : 'YOU '}— ${f.name} &nbsp; ${'●'.repeat(Math.max(f.stocks, 0))}</div>` +
      `<div class="mult" style="color:hsl(${Math.max(0, 60 - f.mult * 12)},100%,60%)">x${f.mult.toFixed(2)}</div>` +
      `<div class="bar"><div style="width:${f.energy}%;background:#ffd23f"></div></div>` +
      `<div class="bar"><div style="width:${f.shield}%;background:${f.shieldBroken > 0 ? '#f55' : '#4fc3ff'}"></div></div>` +
      `<div class="cds">${f.shieldBroken > 0 ? 'SHIELD BROKEN! ' : 'Shield '}${Math.round(f.shield)} &nbsp; ${i ? '' : cds}</div>`;
  });
}

function endGame(winner) {
  state = 'over'; document.getElementById('endt').textContent = winner === 'player' ? 'YOU WIN!' : 'YOU LOSE';
  document.getElementById('end').classList.remove('hidden');
}

function start(kind) {
  document.getElementById('menu').classList.add('hidden');
  const botKind = kind === 'mai' ? 'brave' : 'mai';
  player = new Fighter(kind, V(0, 0, 6), true); bot = new Fighter(botKind, V(0, 0, -6), false);
  fighters.push(player, bot); state = 'play'; setMsg('FIGHT!', 1.2);
  camera.position.set(0, 14, 24);
}
document.querySelectorAll('#menu button').forEach(b => b.onclick = () => start(b.dataset.c));

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  if (state === 'play') {
    if (keys.KeyQ) camYaw += dt * 1.5; if (keys.KeyE) camYaw -= dt * 1.5;
    fighters.forEach(f => stepFighter(f, dt)); updateProjectiles(dt);
  }
  if (fighters.length) render(dt);
  else { camera.position.set(0, 12, 26); camera.lookAt(0, 0, 0); }
  if (msgT > 0 && (msgT -= dt) <= 0) document.getElementById('msg').textContent = '';
  for (const k in pressed) delete pressed[k];
  renderer.render(scene, camera); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__game = { start, get fighters() { return fighters; }, keys, pressed };
