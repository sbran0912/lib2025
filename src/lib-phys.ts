// lib-phys.ts – Port von phys.go (Stand April 2026)
// Verwendet Vector aus lib-std.ts statt raylib Vector2

import { Vector, addVector, subVector, multVector } from "./lib-std.ts";
import * as std from "./lib-std.ts";

// ─── Hilfsfunktionen (Ersatz für raylib Vector2-Funktionen) ──────────────────

function vec(x: number, y: number): Vector { return new Vector(x, y); }

function v2add(a: Vector, b: Vector): Vector { return addVector(a, b); }
function v2sub(a: Vector, b: Vector): Vector { return subVector(a, b); }
function v2scale(a: Vector, s: number): Vector { return multVector(a, s); }
function v2dot(a: Vector, b: Vector): number  { return a.dot(b); }
function v2len(a: Vector): number             { return a.mag(); }

function v2norm(a: Vector): Vector {
  const v = a.copy();
  v.normalize();
  return v;
}

function v2rot(v: Vector, angle: number): Vector {
  return vec(
    v.x * Math.cos(angle) - v.y * Math.sin(angle),
    v.x * Math.sin(angle) + v.y * Math.cos(angle),
  );
}

const INF = Number.MAX_VALUE;

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Shape {
  update(): void;
  draw(color: string, thick: number): void;
  rotate(angle: number): void;
  applyForce(force: Vector, angForce: number): void;
  resetPos(delta: Vector): void;
  applyGravity(gravity: Vector): void;
  clearState(): void;
}

interface BasicShape {
  location:    Vector;
  velocity:    Vector;
  angVelocity: number;
  accel:       Vector;
  angAccel:    number;
  mass:        number;
  inertia:     number;
  isGrounded:  boolean;
}

// ─── Polygon ─────────────────────────────────────────────────────────────────

export class Polygon implements Shape {
  basic:    BasicShape;
  vertices: Vector[];

  constructor(x: number, y: number, w: number, h: number, wall: boolean) {
    const mass    = wall ? INF : w * h;
    const inertia = wall ? INF : mass * (w * w + h * h) / 2;

    this.basic = {
      location:    vec(x + w / 2, y + h / 2),
      velocity:    vec(0, 0),
      angVelocity: 0,
      accel:       vec(0, 0),
      angAccel:    0,
      mass,
      inertia,
      isGrounded:  false,
    };

    this.vertices = [
      vec(x,     y),
      vec(x + w, y),
      vec(x + w, y + h),
      vec(x,     y + h),
    ];
  }

  applyForce(force: Vector, angForce: number) {
    this.basic.accel = v2add(this.basic.accel, force);
    this.basic.angAccel += angForce;
  }

  update() {
    this.basic.velocity    = v2add(this.basic.velocity, this.basic.accel);
    this.basic.angVelocity += this.basic.angAccel;

    this.basic.velocity    = v2scale(this.basic.velocity, 0.9995);
    this.basic.location    = v2add(this.basic.location, this.basic.velocity);
    for (let i = 0; i < this.vertices.length; i++) {
      this.vertices[i] = v2add(this.vertices[i], this.basic.velocity);
    }
    this.basic.angVelocity *= 0.9995;
    this.rotate(this.basic.angVelocity);

    this.basic.accel    = vec(0, 0);
    this.basic.angAccel = 0;
  }

  draw(color: string, thick: number) {
    const n = this.vertices.length;
    std.strokeColor(color);
    std.strokeWidth(thick);
    for (let i = 0; i < n; i++) {
      const a = this.vertices[i];
      const b = this.vertices[(i + 1) % n];
      std.line(a.x, a.y, b.x, b.y);
    }
    // Mittelpunkt
    std.fillColor(color);
    std.circle(this.basic.location.x, this.basic.location.y, 3, 1);
  }

  rotate(angle: number) {
    for (let i = 0; i < this.vertices.length; i++) {
      const rel     = v2sub(this.vertices[i], this.basic.location);
      const rotated = v2rot(rel, angle);
      this.vertices[i] = v2add(rotated, this.basic.location);
    }
  }

  resetPos(delta: Vector) {
    for (let i = 0; i < this.vertices.length; i++) {
      this.vertices[i] = v2add(this.vertices[i], delta);
    }
    this.basic.location = v2add(this.basic.location, delta);
  }

  applyGravity(gravity: Vector) {
    if (this.basic.mass < INF) {
      if (!this.basic.isGrounded) {
        this.applyForce(gravity, 0);
      } else {
        if (v2len(this.basic.velocity) < 0.5 &&
            Math.abs(this.basic.angVelocity) < 0.1) {
          this.basic.velocity    = vec(0, 0);
          this.basic.angVelocity = 0;
        } else {
          const dampingForce    = v2scale(this.basic.velocity, -0.5);
          const dampingAngForce = this.basic.angVelocity * -0.5;
          this.applyForce(dampingForce, dampingAngForce);
        }
      }
    }
  }

  clearState() {
    this.basic.isGrounded = false;
  }
}

// ─── Circle ──────────────────────────────────────────────────────────────────

export class Circle implements Shape {
  basic:       BasicShape;
  radius:      number;
  orientation: Vector;   // Punkt auf Kreisrand (für Rotationsanzeige)

  constructor(x: number, y: number, r: number, wall: boolean) {
    const mass    = wall ? INF : r * r * 2;
    const inertia = wall ? INF : r * r * r * 100;

    this.basic = {
      location:    vec(x, y),
      velocity:    vec(0, 0),
      angVelocity: 0,
      accel:       vec(0, 0),
      angAccel:    0,
      mass,
      inertia,
      isGrounded:  false,
    };
    this.radius      = r;
    this.orientation = vec(r + x, y);
  }

  applyForce(force: Vector, angForce: number) {
    this.basic.accel = v2add(this.basic.accel, force);
    this.basic.angAccel += angForce;
  }

  update() {
    this.basic.velocity    = v2add(this.basic.velocity, this.basic.accel);
    this.basic.angVelocity += this.basic.angAccel;

    this.basic.velocity    = v2scale(this.basic.velocity, 0.9995);
    this.basic.location    = v2add(this.basic.location, this.basic.velocity);
    this.orientation       = v2add(this.orientation, this.basic.velocity);

    this.basic.angVelocity *= 0.9995;
    this.rotate(this.basic.angVelocity);

    this.basic.accel    = vec(0, 0);
    this.basic.angAccel = 0;
  }

  draw(color: string, thick: number) {
    std.strokeColor(color);
    std.strokeWidth(thick);
    std.circle(this.basic.location.x, this.basic.location.y, this.radius, 0);
    // Orientierungslinie
    std.line(
      this.basic.location.x, this.basic.location.y,
      this.orientation.x,    this.orientation.y,
    );
    // Mittelpunkt
    std.fillColor(color);
    std.circle(this.basic.location.x, this.basic.location.y, 3, 1);
  }

  rotate(angle: number) {
    const rel     = v2sub(this.orientation, this.basic.location);
    const rotated = v2rot(rel, angle);
    this.orientation = v2add(rotated, this.basic.location);
  }

  resetPos(delta: Vector) {
    this.basic.location = v2add(this.basic.location, delta);
    this.orientation    = v2add(this.orientation, delta);
  }

  applyGravity(gravity: Vector) {
    if (this.basic.mass < INF) {
      if (!this.basic.isGrounded) {
        this.applyForce(gravity, 0);
      } else {
        const dampingForce    = v2scale(this.basic.velocity, -0.5);
        const dampingAngForce = this.basic.angVelocity * -0.5;
        this.applyForce(dampingForce, dampingAngForce);
      }
    }
  }

  clearState() {
    this.basic.isGrounded = false;
  }
}

// ─── Interne Geometrie-Hilfsfunktionen ───────────────────────────────────────

function projectPolygon(vertices: Vector[], axis: Vector): [number, number] {
  if (vertices.length === 0) return [0, 0];
  let min = v2dot(vertices[0], axis);
  let max = min;
  for (let i = 1; i < vertices.length; i++) {
    const proj = v2dot(vertices[i], axis);
    if (proj < min) min = proj;
    if (proj > max) max = proj;
  }
  return [min, max];
}

function getAxes(vertices: Vector[]): Vector[] {
  const axes: Vector[] = [];
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const a    = vertices[i];
    const b    = vertices[(i + 1) % n];
    const edge = v2norm(v2sub(b, a));
    axes.push(vec(-edge.y, edge.x));
  }
  return axes;
}

function pointInPolygon(point: Vector, vertices: Vector[]): boolean {
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const a       = vertices[i];
    const b       = vertices[(i + 1) % n];
    const edge    = v2sub(b, a);
    const toPoint = v2sub(point, a);
    if (v2dot(edge, toPoint) < 0) return false;
  }
  return true;
}

function findContactPoints(verticesA: Vector[], verticesB: Vector[]): Vector[] {
  const contacts: Vector[] = [];
  for (const p of verticesA) {
    if (pointInPolygon(p, verticesB)) contacts.push(p);
  }
  for (const p of verticesB) {
    if (pointInPolygon(p, verticesA)) contacts.push(p);
  }
  return contacts;
}

function findReferenceEdge(vertices: Vector[], normal: Vector): [Vector, Vector] {
  let bestDot = -INF;
  let p1 = vec(0, 0);
  let p2 = vec(0, 0);
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const a         = vertices[i];
    const b         = vertices[(i + 1) % n];
    const edge      = v2norm(v2sub(b, a));
    const edgeNormal = vec(-edge.y, edge.x);
    const d         = v2dot(edgeNormal, normal);
    if (d > bestDot) { bestDot = d; p1 = a; p2 = b; }
  }
  return [p1, p2];
}

function projectPointOntoEdge(p: Vector, a: Vector, b: Vector): Vector {
  const ab = v2sub(b, a);
  let t    = v2dot(v2sub(p, a), ab) / v2dot(ab, ab);
  t        = Math.min(1, Math.max(0, t));
  return v2add(a, v2scale(ab, t));
}

function transferContactsToA(contacts: Vector[], verticesA: Vector[], normal: Vector): Vector[] {
  const [refStart, refEnd] = findReferenceEdge(verticesA, normal);
  return contacts.map(c => projectPointOntoEdge(c, refStart, refEnd));
}

// ─── Massen-basierte Positions-Resets ────────────────────────────────────────

function resetPolyPositionsBasedOnMass(polyA: Polygon, polyB: Polygon, mtv: Vector) {
  if (polyA.basic.mass < INF) {
    polyA.resetPos(v2scale(mtv, -0.5));
  } else {
    polyB.resetPos(v2scale(mtv, 0.5));
  }
  if (polyB.basic.mass < INF) {
    polyB.resetPos(v2scale(mtv, 0.5));
  } else {
    polyA.resetPos(v2scale(mtv, -0.5));
  }
}

function resetCirclePolyPositionsBasedOnMass(poly: Polygon, circle: Circle, mtv: Vector) {
  if (poly.basic.mass < INF) {
    poly.resetPos(v2scale(mtv, -0.5));
  } else {
    circle.resetPos(v2scale(mtv, 0.5));
  }
  if (circle.basic.mass < INF) {
    circle.resetPos(v2scale(mtv, 0.5));
  } else {
    poly.resetPos(v2scale(mtv, -0.5));
  }
}

function resetCirclePositionsBasedOnMass(cA: Circle, cB: Circle, mtv: Vector) {
  if (cA.basic.mass < INF) {
    cA.resetPos(v2scale(mtv, -0.5));
  } else {
    cB.resetPos(v2scale(mtv, 0.5));
  }
  if (cB.basic.mass < INF) {
    cB.resetPos(v2scale(mtv, 0.5));
  } else {
    cA.resetPos(v2scale(mtv, -0.5));
  }
}

// ─── Relative Vektoren (für Impulsberechnung) ────────────────────────────────

type RelVectors = { rAP_perp: Vector; rBP_perp: Vector; vGesamtA: Vector; velocity_AB: Vector };

function calcPolyRelVectors(polyA: Polygon, polyB: Polygon, cp: Vector): RelVectors {
  const rAP      = v2sub(cp, polyA.basic.location);
  const rBP      = v2sub(cp, polyB.basic.location);
  const rAP_perp = vec(-rAP.y, rAP.x);
  const rBP_perp = vec(-rBP.y, rBP.x);
  const VtanA    = v2scale(rAP_perp, polyA.basic.angVelocity);
  const VtanB    = v2scale(rBP_perp, polyB.basic.angVelocity);
  const vGesamtA = v2add(polyA.basic.velocity, VtanA);
  const vGesamtB = v2add(polyB.basic.velocity, VtanB);
  return { rAP_perp, rBP_perp, vGesamtA, velocity_AB: v2sub(vGesamtA, vGesamtB) };
}

function calcCirclePolyRelVectors(poly: Polygon, circle: Circle, cp: Vector): RelVectors {
  const rAP      = v2sub(cp, poly.basic.location);
  const rBP      = v2sub(cp, circle.basic.location);
  const rAP_perp = vec(-rAP.y, rAP.x);
  const rBP_perp = vec(-rBP.y, rBP.x);
  const VtanA    = v2scale(rAP_perp, poly.basic.angVelocity);
  const VtanB    = v2scale(rBP_perp, circle.basic.angVelocity);
  const vGesamtA = v2add(poly.basic.velocity, VtanA);
  const vGesamtB = v2add(circle.basic.velocity, VtanB);
  return { rAP_perp, rBP_perp, vGesamtA, velocity_AB: v2sub(vGesamtA, vGesamtB) };
}

function calcCircleRelVectors(cA: Circle, cB: Circle, mtv: Vector): RelVectors {
  const nMtv     = v2norm(mtv);
  const rA       = v2scale(nMtv, -cA.radius);
  const rB       = v2scale(nMtv,  cB.radius);
  const rAP_perp = vec(-rA.y, rA.x);
  const rBP_perp = vec(-rB.y, rB.x);
  const VtanA    = v2scale(rAP_perp, cA.basic.angVelocity);
  const VtanB    = v2scale(rBP_perp, cB.basic.angVelocity);
  const vGesamtA = v2add(cA.basic.velocity, VtanA);
  const vGesamtB = v2add(cB.basic.velocity, VtanB);
  return { rAP_perp, rBP_perp, vGesamtA, velocity_AB: v2sub(vGesamtA, vGesamtB) };
}

// ─── Grounded-Checks ─────────────────────────────────────────────────────────

function isHorizontal(mtv: Vector, gravity: Vector): boolean {
  const result = v2dot(mtv, gravity) / (v2len(mtv) * v2len(gravity));
  return result > 0.9 || result < -0.9;
}

function isCircleGrounded(angVel: number, velocity_AB: Vector, mtv: Vector): boolean {
  if (v2len(velocity_AB) > 0.5)       return false;
  if (Math.abs(angVel) > 0.1)         return false;
  const gravity = vec(0, 1);
  const dot     = v2dot(mtv, gravity);
  const lenM    = v2len(mtv);
  const lenG    = v2len(gravity);
  if (lenM === 0 || lenG === 0)        return false;
  return dot / (lenM * lenG) < -0.9;
}

function isPolyGrounded(contacts: Vector[], vGesamtA: Vector, velocity_AB: Vector, mtv: Vector): boolean {
  return contacts.length > 1 &&
    v2len(velocity_AB) < 1.5 &&
    v2len(vGesamtA) < 1.5 &&
    isHorizontal(mtv, vec(0, 1));
}

function findPolyTop(polyA: Polygon, polyB: Polygon, mtv: Vector): Polygon {
  return v2dot(mtv, vec(0, 1)) > 0 ? polyA : polyB;
}

function isCenterOfMassSupported(location: Vector, contacts: Vector[], normal: Vector): boolean {
  if (contacts.length < 2) return false;
  const tangent  = vec(-normal.y, normal.x);
  const comProj  = v2dot(location, tangent);
  let minP =  INF;
  let maxP = -INF;
  for (const cp of contacts) {
    const proj = v2dot(cp, tangent);
    if (proj < minP) minP = proj;
    if (proj > maxP) maxP = proj;
  }
  const epsilon = 0.5;
  return comProj >= minP - epsilon && comProj <= maxP + epsilon;
}

// ─── Impuls- und Kraftberechnungen ───────────────────────────────────────────

function calcFrictionVector(mtv: Vector, velocity_AB: Vector): Vector {
  const t  = vec(-mtv.y, mtv.x);
  const sp = v2dot(velocity_AB, t);
  return v2norm(v2scale(t, sp));
}

function calcPolyImpulse(
  polyA: Polygon, polyB: Polygon,
  mtv: Vector, rAP_perp: Vector, rBP_perp: Vector, velocity_AB: Vector,
  e: number,
): number {
  const jNum   = v2dot(v2scale(velocity_AB, -(1 + e)), mtv);
  const jLinear = v2dot(mtv, v2scale(mtv, 1 / polyA.basic.mass + 1 / polyB.basic.mass));
  const jAng    = Math.pow(v2dot(rAP_perp, mtv), 2) / polyA.basic.inertia +
                  Math.pow(v2dot(rBP_perp, mtv), 2) / polyB.basic.inertia;
  return jNum / (jLinear + jAng);
}

function calcCirclePolyImpulse(
  poly: Polygon, circle: Circle,
  mtv: Vector, rAP_perp: Vector, velocity_AB: Vector,
  e: number,
): number {
  const jNum    = v2dot(v2scale(velocity_AB, -(1 + e)), mtv);
  const jLinear = v2dot(mtv, v2scale(mtv, 1 / poly.basic.mass + 1 / circle.basic.mass));
  const jAng    = Math.pow(v2dot(rAP_perp, mtv), 2) / poly.basic.inertia;
  return jNum / (jLinear + jAng);
}

function calcCircleImpulse(
  cA: Circle, cB: Circle,
  mtv: Vector, velocity_AB: Vector,
  e: number,
): number {
  const jNum    = v2dot(v2scale(velocity_AB, -(1 + e)), mtv);
  const jLinear = v2dot(mtv, v2scale(mtv, 1 / cA.basic.mass + 1 / cB.basic.mass));
  return jNum / jLinear;
}

type Forces = { forceA: Vector; angForceA: number; forceB: Vector; angForceB: number };

function calcPolyCollisionForces(
  polyA: Polygon, polyB: Polygon,
  mtv: Vector, rAP_perp: Vector, rBP_perp: Vector, velocity_AB: Vector,
): Forces {
  const e = 0.4;
  const t = calcFrictionVector(mtv, velocity_AB);
  const f = -0.15;
  const j = calcPolyImpulse(polyA, polyB, mtv, rAP_perp, rBP_perp, velocity_AB, e);

  const forceA    = v2add(v2scale(mtv, j / polyA.basic.mass), v2scale(t, f * -j / polyA.basic.mass));
  const angForceA = v2dot(rAP_perp, v2add(v2scale(mtv, j / polyA.basic.inertia), v2scale(t, f * -j / polyA.basic.inertia)));
  const forceB    = v2add(v2scale(mtv, -j / polyB.basic.mass), v2scale(t, f * j / polyB.basic.mass));
  const angForceB = v2dot(rBP_perp, v2add(v2scale(mtv, -j / polyB.basic.inertia), v2scale(t, f * j / polyB.basic.inertia)));
  return { forceA, angForceA, forceB, angForceB };
}

function calcCirclePolyCollisionForces(
  poly: Polygon, circle: Circle,
  mtv: Vector, rAP_perp: Vector, rBP_perp: Vector, velocity_AB: Vector,
): Forces {
  const e = 0.3;
  const t = calcFrictionVector(mtv, velocity_AB);
  const f = -0.15;
  const j = calcCirclePolyImpulse(poly, circle, mtv, rAP_perp, velocity_AB, e);

  const forceA    = v2add(v2scale(mtv, j / poly.basic.mass), v2scale(t, f * -j / poly.basic.mass));
  const angForceA = v2dot(rAP_perp, v2add(v2scale(mtv, j / poly.basic.inertia), v2scale(t, f * -j / poly.basic.inertia)));
  const forceB    = v2add(v2scale(mtv, -j / circle.basic.mass), v2scale(t, f * j / circle.basic.mass));
  const angForceB = v2dot(rBP_perp, v2scale(t, f * j / circle.basic.inertia));
  return { forceA, angForceA, forceB, angForceB };
}

function calcCircleCollisionForces(
  cA: Circle, cB: Circle,
  mtv: Vector, rAP_perp: Vector, rBP_perp: Vector, velocity_AB: Vector,
): Forces {
  const e = 0.3;
  const t = calcFrictionVector(mtv, velocity_AB);
  const f = -0.15;
  const j = calcCircleImpulse(cA, cB, mtv, velocity_AB, e);

  const forceA    = v2add(v2scale(mtv, j / cA.basic.mass), v2scale(t, f * j / cA.basic.mass));
  const angForceA = v2dot(rAP_perp, v2scale(t, f * j / cA.basic.inertia));
  const forceB    = v2add(v2scale(mtv, -j / cB.basic.mass), v2scale(t, f * -j / cB.basic.mass));
  const angForceB = v2dot(rBP_perp, v2scale(t, f * -j / cB.basic.inertia));
  return { forceA, angForceA, forceB, angForceB };
}

// ─── Kollisionserkennung ─────────────────────────────────────────────────────

type CollResult = { isColliding: boolean; mtv: Vector; contacts: Vector[] };
const NO_COLL: CollResult = { isColliding: false, mtv: vec(0, 0), contacts: [] };

export function detectCollisionPoly(polyA: Polygon, polyB: Polygon): CollResult {
  let smallestOverlap = INF;
  let smallestAxis    = vec(0, 0);

  const axes = [...getAxes(polyA.vertices), ...getAxes(polyB.vertices)];
  for (const axis of axes) {
    const [minA, maxA] = projectPolygon(polyA.vertices, axis);
    const [minB, maxB] = projectPolygon(polyB.vertices, axis);
    const overlap      = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (overlap <= 0) return NO_COLL;

    if (overlap < smallestOverlap) {
      smallestOverlap = overlap;
      smallestAxis    = axis;
      const dir = v2sub(polyB.basic.location, polyA.basic.location);
      if (v2dot(dir, smallestAxis) < 0) smallestAxis = v2scale(smallestAxis, -1);
    }
  }

  const mtv         = v2scale(smallestAxis, smallestOverlap);
  const rawContacts = findContactPoints(polyA.vertices, polyB.vertices);
  const contacts    = transferContactsToA(rawContacts, polyA.vertices, v2scale(smallestAxis, -1));
  if (contacts.length > 0) return { isColliding: true, mtv, contacts };
  return NO_COLL;
}

export function detectCollisionCirclePoly(poly: Polygon, circle: Circle): CollResult {
  const n = poly.vertices.length;
  let closestDistSq = INF;
  let closestPoint  = vec(0, 0);
  let inside        = true;

  for (let i = 0; i < n; i++) {
    const a        = poly.vertices[i];
    const b        = poly.vertices[(i + 1) % n];
    const edge     = v2sub(b, a);
    const toCircle = v2sub(circle.basic.location, a);
    const normal   = vec(-edge.y, edge.x);

    if (v2dot(normal, toCircle) < 0) inside = false;

    const edgeLenSq = v2dot(edge, edge);
    const t         = v2dot(toCircle, edge) / edgeLenSq;
    const clamped   = Math.min(1, Math.max(0, t));
    const current   = v2add(a, v2scale(edge, clamped));
    const diff      = v2sub(circle.basic.location, current);
    const distSq    = v2dot(diff, diff);

    if (distSq < closestDistSq) { closestDistSq = distSq; closestPoint = current; }
  }

  if (inside || closestDistSq <= circle.radius * circle.radius) {
    let axis: Vector;
    let overlap: number;

    if (inside) {
      let minOverlap = INF;
      axis = vec(0, -1);
      for (let i = 0; i < n; i++) {
        const a        = poly.vertices[i];
        const b        = poly.vertices[(i + 1) % n];
        const edge     = v2sub(b, a);
        const normal   = v2norm(vec(-edge.y, edge.x));
        const toCircle = v2sub(circle.basic.location, a);
        const dist     = v2dot(normal, toCircle);
        const ov       = dist + circle.radius;
        if (ov < minOverlap) { minOverlap = ov; axis = v2scale(normal, -1); }
      }
      overlap = minOverlap;
    } else {
      const dist = Math.sqrt(closestDistSq);
      overlap    = circle.radius - dist;
      if (dist > 1e-6) {
        axis = v2scale(v2sub(circle.basic.location, closestPoint), 1 / dist);
      } else {
        axis = vec(0, -1);
      }
    }

    const mtv = v2scale(axis, overlap);
    return { isColliding: true, mtv, contacts: [closestPoint] };
  }

  return NO_COLL;
}

export function detectCollisionCircle(cA: Circle, cB: Circle): CollResult {
  const line       = v2sub(cA.basic.location, cB.basic.location);
  const dist       = v2len(line);
  const radiusSum  = cA.radius + cB.radius;
  if (dist < radiusSum) {
    const overlap = dist - radiusSum;
    const mtv     = v2scale(v2norm(line), overlap);
    return { isColliding: true, mtv, contacts: [] };
  }
  return NO_COLL;
}

// ─── Kollisionsauflösung ──────────────────────────────────────────────────────

export function resolveCollisionPoly(
  polyA: Polygon, polyB: Polygon,
  contacts: Vector[], mtv: Vector,
): Forces {
  const slop      = 0.5;
  const mtvLength = v2len(mtv);

  if (mtvLength > slop) {
    const mtvCorr = v2scale(v2norm(mtv), mtvLength - slop);
    resetPolyPositionsBasedOnMass(polyA, polyB, mtvCorr);
  }

  const mtvN = v2norm(mtv);

  const centerCP = contacts.length > 1
    ? v2scale(v2add(contacts[0], contacts[1]), 0.5)
    : contacts[0];

  const { vGesamtA: vGA, velocity_AB: vAB } = calcPolyRelVectors(polyA, polyB, centerCP);

  const polyTop = findPolyTop(polyA, polyB, mtvN);
  if (isPolyGrounded(contacts, vGA, vAB, mtvN)) {
    polyTop.basic.isGrounded = isCenterOfMassSupported(polyTop.basic.location, contacts, mtvN);
  } else {
    polyTop.basic.isGrounded = false;
  }

  let sumForceA    = vec(0, 0);
  let sumForceB    = vec(0, 0);
  let sumAngForceA = 0;
  let sumAngForceB = 0;
  let applied      = 0;

  for (const cp of contacts) {
    const { rAP_perp, rBP_perp, velocity_AB } = calcPolyRelVectors(polyA, polyB, cp);
    if (v2dot(velocity_AB, v2scale(mtvN, -1)) < 0) {
      const f = calcPolyCollisionForces(polyA, polyB, mtvN, rAP_perp, rBP_perp, velocity_AB);
      sumForceA    = v2add(sumForceA, f.forceA);
      sumAngForceA += f.angForceA;
      sumForceB    = v2add(sumForceB, f.forceB);
      sumAngForceB += f.angForceB;
      applied++;
    }
  }

  if (applied > 0) {
    return {
      forceA:    v2scale(sumForceA, 1 / applied),
      angForceA: sumAngForceA / applied,
      forceB:    v2scale(sumForceB, 1 / applied),
      angForceB: sumAngForceB / applied,
    };
  }
  return { forceA: vec(0, 0), angForceA: 0, forceB: vec(0, 0), angForceB: 0 };
}

export function resolveCollisionCirclePoly(
  poly: Polygon, circle: Circle,
  contacts: Vector[], mtv: Vector,
): Forces {
  const slop      = 0.5;
  const mtvLength = v2len(mtv);

  if (mtvLength > slop) {
    const mtvCorr = v2scale(v2norm(mtv), mtvLength - slop);
    resetCirclePolyPositionsBasedOnMass(poly, circle, mtvCorr);
  }

  const mtvN = v2norm(mtv);
  const cp   = contacts[0];
  const { rAP_perp, rBP_perp, velocity_AB } = calcCirclePolyRelVectors(poly, circle, cp);

  circle.basic.isGrounded = isCircleGrounded(
    circle.basic.angVelocity,
    v2scale(velocity_AB, -1),
    v2scale(mtvN, -1),
  );

  if (v2dot(velocity_AB, v2scale(mtvN, -1)) < 0) {
    return calcCirclePolyCollisionForces(poly, circle, mtvN, rAP_perp, rBP_perp, velocity_AB);
  }
  return { forceA: vec(0, 0), angForceA: 0, forceB: vec(0, 0), angForceB: 0 };
}

export function resolveCollisionCircle(
  cA: Circle, cB: Circle,
  mtv: Vector,
): Forces {
  const slop      = 0.5;
  const mtvLength = v2len(mtv);

  if (mtvLength > slop) {
    const mtvCorr = v2scale(v2norm(mtv), mtvLength - slop);
    resetCirclePositionsBasedOnMass(cA, cB, mtvCorr);
  }

  const mtvN = v2norm(mtv);
  const { rAP_perp, rBP_perp, velocity_AB } = calcCircleRelVectors(cA, cB, mtvN);

  cA.basic.isGrounded = isCircleGrounded(cA.basic.angVelocity, velocity_AB, mtvN);
  cB.basic.isGrounded = isCircleGrounded(cB.basic.angVelocity, v2scale(velocity_AB, -1), v2scale(mtvN, -1));

  if (v2dot(velocity_AB, v2scale(mtvN, -1)) < 0) {
    return calcCircleCollisionForces(cA, cB, mtvN, rAP_perp, rBP_perp, velocity_AB);
  }
  return { forceA: vec(0, 0), angForceA: 0, forceB: vec(0, 0), angForceB: 0 };
}

// ─── Öffentliche Dispatcher ───────────────────────────────────────────────────

export function detectCollision(a: Shape, b: Shape): CollResult {
  if (a instanceof Polygon && b instanceof Polygon) return detectCollisionPoly(a, b);
  if (a instanceof Polygon && b instanceof Circle)  return detectCollisionCirclePoly(a, b);
  if (a instanceof Circle  && b instanceof Polygon) return detectCollisionCirclePoly(b, a);
  if (a instanceof Circle  && b instanceof Circle)  return detectCollisionCircle(a, b);
  return NO_COLL;
}

export function resolveCollision(
  a: Shape, b: Shape,
  contacts: Vector[], mtv: Vector,
): Forces {
  if (a instanceof Polygon && b instanceof Polygon) return resolveCollisionPoly(a, b, contacts, mtv);
  if (a instanceof Polygon && b instanceof Circle)  return resolveCollisionCirclePoly(a, b, contacts, mtv);
  if (a instanceof Circle  && b instanceof Polygon) return resolveCollisionCirclePoly(b, a, contacts, mtv);
  if (a instanceof Circle  && b instanceof Circle)  return resolveCollisionCircle(a, b, mtv);
  return { forceA: vec(0, 0), angForceA: 0, forceB: vec(0, 0), angForceB: 0 };
}
