// Version: 1.0 Stand Februar 2023

import * as std from './lib-std.ts';
import * as utils from './lib-utils.ts'

// Konstanten
const COEFFICIENT = 0.5;                      //Reibungskoeffizient
const GRAVITY = new std.Vector(0, 0.025);       //Gravitation

export interface Shape {
    typ: string;
    location: std.Vector; 
    vertices?: std.Vector[];
    velocity: std.Vector;
    angVelocity: number;
    radius?: number;
    accel: std.Vector;
    angAccel: number;
    mass: number;
    inertia: number;
    orientation?: std.Vector;
    display: () => void;
    rotate: (angle: number) => void;
    applyForce: (force: std.Vector, angForce: number) => void;
    resetPos: (v: std.Vector) => void;
    update: () => void;
}

export class Box implements Shape{
    typ: string;
    vertices: std.Vector[];
    location: std.Vector;
    velocity: std.Vector;
    angVelocity: number;
    accel: std.Vector;
    angAccel: number;
    mass: number;
    inertia: number;

    constructor (x: number, y: number, w: number, h: number) {
        this.typ = "Box";
        this.vertices = new Array(5);
        this.vertices[0] = new std.Vector(x, y);
        this.vertices[1] = new std.Vector(x + w, y);
        this.vertices[2] = new std.Vector(x + w, y + h);
        this.vertices[3] = new std.Vector(x, y + h);
        this.vertices[4] = this.vertices[0];
        this.location = new std.Vector(x + w / 2, y + h / 2);
        this.velocity = new std.Vector(0, 0);
        this.angVelocity = 0;
        this.accel = new std.Vector(0, 0);
        this.angAccel = 0;
        this.mass = (w + h)*2;
        this.inertia = w * h * w;
    }

    rotate(angle: number) {
        for (let i = 0; i < 4; i++) {
            this.vertices[i].rotateMatrix(this.location, angle);
        }
    }

    update() {
        this.velocity.add(this.accel);
        this.velocity.limit(10);
        this.accel.set(0,0);
        this.angVelocity += this.angAccel;
        this.angVelocity = utils.limitNum(this.angVelocity, 0.05);
        this.angAccel = 0;

        this.location.add(this.velocity);
        this.vertices[0].add(this.velocity);
        this.vertices[1].add(this.velocity);
        this.vertices[2].add(this.velocity);
        this.vertices[3].add(this.velocity);
        this.rotate(this.angVelocity);
    }

    display() {
        std.shape(this.vertices[0].x, this.vertices[0].y, this.vertices[1].x, this.vertices[1].y, this.vertices[2].x, this.vertices[2].y, this.vertices[3].x, this.vertices[3].y, 0);
        std.circle(this.location.x, this.location.y, 2, 0);
    }

    applyForce(force: std.Vector, angForce: number) {
        this.accel.add(std.divVector(force, this.mass));
        this.angAccel += angForce / this.mass; 
    }

    resetPos(v: std.Vector) {
        if (this.mass != Infinity) {
            this.location.add(v);
            this.vertices[0].add(v);
            this.vertices[1].add(v);
            this.vertices[2].add(v);
            this.vertices[3].add(v);    
        }
    }
}

export class Ball implements Shape {
    typ: string;
    location: std.Vector;
    velocity: std.Vector;
    angVelocity: number;
    radius: number;
    accel: std.Vector;
    angAccel: number;
    mass: number;
    inertia: number;
    orientation: std.Vector;

    constructor(x: number, y: number, radius: number) {
        this.typ = "Ball";
        this.location = new std.Vector(x, y);
        this.velocity = new std.Vector(0, 0);
        this.angVelocity = 0;
        this.radius = radius;
        this.accel = new std.Vector(0, 0);
        this.angAccel = 0;
        this.mass = (radius * radius)/4;
        this.inertia = radius * radius * radius/2;
        this.orientation = new std.Vector(radius + x, 0 + y);     
    }
    
    display() {
        std.circle(this.location.x, this.location.y, this.radius, 0);
        std.line(this.location.x, this.location.y, this.orientation.x, this.orientation.y);
    }

    rotate(angle: number) {
        this.orientation.rotateMatrix(this.location, angle);
    }

    applyForce(force: std.Vector, angForce: number) {
        this.accel.add(std.divVector(force, this.mass));
        this.angAccel += angForce / this.mass; 
    }
    
    resetPos(v: std.Vector) {
        this.location.add(v);
        this.orientation.add(v);
    }

    update() {
        this.velocity.add(this.accel);
        this.velocity.limit(10);
        this.accel.set(0,0);
        this.angVelocity += this.angAccel;
        this.angVelocity = utils.limitNum(this.angVelocity, 0.05);
        this.angAccel = 0;

        this.location.add(this.velocity);
        this.orientation.add(this.velocity);
        this.rotate(this.angVelocity);
    }
}

export class Wall extends Box{

    constructor(x: number,y: number,w: number,h: number) {
      super (x,y,w,h)
      this.mass = Infinity;
      this.inertia = Infinity;
      this.typ = "Wall";
    }
  
    display() {
        std.push();
        std.strokeColor(0);
        super.display();
        std.pop();
    }
}

/**
 * @param a Box
 * @param b Box
 * @returns cp, normal
 */
function detectCollisionBox(a: Shape, b:Shape): [std.Vector|null, std.Vector|null] {
    // Geprüft wird, ob eine Ecke von boxA in die Kante von boxB schneidet
    // Zusätzlich muss die Linie von Mittelpunkt boxA und Mittelpunkt boxB durch Kante von boxB gehen
    // i ist Index von Ecke und j ist Index von Kante
    // d = Diagonale von A.Mittelpunkt zu A.vertices(i)
    // e = Kante von B(j) zu B(j+1)
    // z = Linie von A.Mittelpunkt zu B.Mittelpunkt
    // _perp = Perpendicularvektor
    // scalar_d Faktor von d für den Schnittpunkt d/e
    // scalar_z Faktor von z für den Schnittpunkt z/e
    // mtv = minimal translation vector (überlappender Teil von d zur Kante e)

    for (let i = 0; i < 4; i++) {            
        for (let j = 0; j < 4; j++) {
            // Prüfung auf intersection von Diagonale d zu Kante e
            let [, scalar_d] = std.intersect(a.location, a.vertices[i], b.vertices[j], b.vertices[j + 1])
            if (scalar_d) {
                // Prüfung auf intersection Linie z zu Kante e
                let [, scalar_z] = std.intersect(a.location, b.location, b.vertices[j], b.vertices[j + 1])
                if (scalar_z) {
                    // Collision findet statt
                    // Objekte zurücksetzen und normal_e berechnen. Kollisionspunkz ist Ecke i von BoxA
                    let e = std.subVector(b.vertices[j + 1], b.vertices[j]);
                    let e_perp = new std.Vector(-(e.y), e.x);   
                    let d = std.subVector(a.vertices[i], a.location);
                    d.mult(1 - scalar_d);
                    e_perp.normalize(); 
                    let distance = std.dotProduct(e_perp, d);
                    e_perp.mult(-distance); // mtv 
                    a.resetPos(std.multVector(e_perp, 0.5));
                    b.resetPos(std.multVector(e_perp, -0.5));
                    e_perp.normalize(); // normal_e
                    return [a.vertices[i], e_perp]
                }
            }
        }
    }
    return [null, null];
}

/**
 * @param boxA 
 * @param boxB 
 * @param cp Collisionpoint
 * @param normal Normalvector to edge e
 */
function resolveCollisionBox(boxA: Shape, boxB: Shape, cp: std.Vector, normal: std.Vector) {
    // rAP = Linie von A.location zu Kollisionspunkt (Ecke i von BoxA)
    let rAP = std.subVector(cp, boxA.location);
    // rBP = Linie von B.location zu Kollisionspunkt (ebenfalls Ecke i von BoxA)
    let rBP = std.subVector(cp, boxB.location);
    let rAP_perp = new std.Vector(-rAP.y, rAP.x);
    let rBP_perp = new std.Vector(-rBP.y, rBP.x);
    let VtanA = std.multVector(rAP_perp, boxA.angVelocity);
    let VtanB = std.multVector(rBP_perp, boxB.angVelocity);
    let VgesamtA = std.addVector(boxA.velocity, VtanA);
    let VgesamtB = std.addVector(boxB.velocity, VtanB);
    const velocity_AB = std.subVector(VgesamtA, VgesamtB);
    if (std.dotProduct(velocity_AB, normal) < 0) { // wenn negativ, dann auf Kollisionskurs
        let e = 0.7; //inelastischer Stoß
        let j_denominator = std.dotProduct(std.multVector(velocity_AB, -(1+e)), normal);
        let j_divLinear = std.dotProduct(normal, std.multVector(normal, (1/boxA.mass + 1/boxB.mass)));
        let j_divAngular = Math.pow(std.dotProduct(rAP_perp, normal), 2) / boxA.inertia + Math.pow(std.dotProduct(rBP_perp, normal), 2) / boxB.inertia;
        let j = j_denominator / (j_divLinear + j_divAngular);
        // Grundlage für Friction berechnen (t)
        let t = new std.Vector(-(normal.y), normal.x);
        let t_scalarprodukt = std.dotProduct(velocity_AB, t);
        t.mult(t_scalarprodukt);
        t.normalize();
        
        //apply Force to acceleration
        boxA.accel.add(std.addVector(std.multVector(normal, (j/boxA.mass)), std.multVector(t, (0.2*-j/boxA.mass))));
        boxB.accel.add(std.addVector(std.multVector(normal, (-j/boxB.mass)), std.multVector(t, (0.2*j/boxB.mass))));
        boxA.angAccel += std.dotProduct(rAP_perp, std.addVector(std.multVector(normal, j/boxA.inertia), std.multVector(t, 0.2*-j/boxA.inertia)));
        boxB.angAccel += std.dotProduct(rBP_perp, std.addVector(std.multVector(normal, -j/boxB.inertia), std.multVector(t, 0.2*j/boxB.inertia)));
    }

}

/**
 * @param a Ball
 * @param b Ball
 * @returns normal
 */
function detectCollisionBall(a: Shape, b: Shape): std.Vector|null {
    //Distanz ermitteln
    let radiusTotal = a.radius + b.radius;
    let distance = a.location.dist(b.location);
    if (distance < radiusTotal) {
        //Treffer
        let space = (radiusTotal - distance);
        let collisionLine = std.subVector(a.location, b.location);
        collisionLine.setMag(space);
        a.resetPos(std.multVector(collisionLine, 0.5));
        b.resetPos(std.multVector(collisionLine, -0.5));
        collisionLine.normalize();
        return collisionLine;
    }
    return null;
}

/**
 * @param a Ball
 * @param b Ball
 * @param normal 
 */
function resolveCollisionBall(a: Shape, b: Shape, normal: std.Vector) {
    const rA = std.multVector(normal, -a.radius);
    const rA_perp = new std.Vector(-rA.y, rA.x);
    const rB = std.multVector(normal, b.radius);
    const rB_perp = new std.Vector(-rB.y, rB.x);
    const VtanA = std.multVector(rA_perp, a.angVelocity);
    const VtanB = std.multVector(rB_perp, b.angVelocity);
    const VgesamtA = std.addVector(a.velocity, VtanA);
    const VgesamtB = std.addVector(b.velocity, VtanB);
    const velocity_AB = std.subVector(VgesamtA, VgesamtB);

    if (std.dotProduct(velocity_AB, normal) < 0) { // wenn negativ, dann auf Kollisionskurs
        const e = 0.7; //inelastischer Stoß
        const j_denominator = std.dotProduct(std.multVector(velocity_AB, -(1+e)), normal);
        const j_divLinear = std.dotProduct(normal, std.multVector(normal, (1/a.mass + 1/b.mass)));
        const j = j_denominator / j_divLinear;
        // Grundlage für Friction berechnen
        const t = new std.Vector(-(normal.y), normal.x);
        const t_scalarprodukt = std.dotProduct(velocity_AB, t);
        t.mult(t_scalarprodukt);
        t.normalize();
        //apply Force
        a.accel.add(std.addVector(std.multVector(normal, (0.8*j/a.mass)), std.multVector(t, (0.2*-j/a.mass))));
        b.accel.add(std.addVector(std.multVector(normal, (0.8*-j/b.mass)), std.multVector(t, (0.2*j/b.mass))))
        a.angAccel += std.dotProduct(rA_perp, std.multVector(t, 0.1*-j/a.inertia));
        b.angAccel += std.dotProduct(rB_perp, std.multVector(t, 0.1*j/b.inertia));
    }
}

/**
 * @param ball 
 * @param box 
 * @returns cp, normal
 */
function detectCollisionBallBox(ball: Shape, box: Shape): [std.Vector|null, std.Vector|null] {
    for (let j = 0; j < 4; j++) {
        let e = std.subVector(box.vertices[j+1], box.vertices[j]);
        //Vektor von Ecke der Box zum Ball
        let VerticeToBall = std.subVector(ball.location, box.vertices[j]);
        // --------- Einfügung 09.04.2021, um Kollision mit Ecken abzufangen
        if (VerticeToBall.mag() < ball.radius) {
            return [box.vertices[j], VerticeToBall];
        }
        // --------- Ende Einfügung 09.04.2021
        let mag_e = e.mag();
        e.normalize();
        //Scalarprojektion von Vektor VerticeToBall auf Kante e
        let scalar_e = std.dotProduct(VerticeToBall, e);
        if (scalar_e > 0 && scalar_e <= mag_e) {
            //Senkrechte von Ball trifft auf Kante e der Box
            //e2 = Kante e mit der Länge von scalar_e
            let e2 = std.multVector(e, scalar_e);
            //Senkrechte von e zum Ball = VerticeToBall - e2
            let e_perp = std.subVector(VerticeToBall, e2);

            if (e_perp.mag() < ball.radius) {
                //Ball berührt Box
                //Abstand wieder herstellen mit mtv (minimal translation vector)
                let mtv = e_perp.copy();
                let p = std.addVector(box.vertices[j], e2);
                mtv.setMag(ball.radius - e_perp.mag());
                //e_perp und damit mtv zeigt von Kante zu Ball
                ball.resetPos(mtv);
                //vor Berechnung muss e_perp normalisiert werden
                e_perp.normalize();
                //resolveCollisionBallBox(ball, box, p, e_perp)
                return [p, e_perp]
            }
        }
    }
    return [null, null];
}

/**
 * @param {Shape} ball 
 * @param {Shape} box 
 * @param {std.Vector} cp Collision Point
 * @param {std.Vector} normal Normal Vector
 */
function resolveCollisionBallBox(ball: Shape, box: Shape, cp: std.Vector, normal: std.Vector) {
    const rA = std.multVector(normal, -ball.radius);
    const rA_perp = new std.Vector(-rA.y, rA.x);
    const rBP = std.subVector(cp, box.location);
    const rBP_perp = new std.Vector(-rBP.y, rBP.x);
    const VtanA = std.multVector(rA_perp, ball.angVelocity);
    const VgesamtA = std.addVector(ball.velocity, VtanA);
    const VtanB = std.multVector(rBP_perp, box.angVelocity);
    const VgesamtB = std.addVector(box.velocity, VtanB);
    const velocity_AB = std.subVector(VgesamtA, VgesamtB);

    if (std.dotProduct(velocity_AB, normal) < 0) { // wenn negativ, dann auf Kollisionskurs

        const e = 0.7; //inelastischer Stoß
        const j_denominator = std.dotProduct(std.multVector(velocity_AB, -(1+e)), normal);
        const j_divLinear = std.dotProduct(normal, std.multVector(normal, (1/ball.mass + 1/box.mass)));
        const j_divAngular = Math.pow(std.dotProduct(rBP_perp, normal), 2) / box.inertia; //nur für Box zu rechnen
        const j = j_denominator / (j_divLinear + j_divAngular);
        // Grundlage für Friction berechnen
        const t = new std.Vector(-(normal.y), normal.x);
        const t_scalarprodukt = std.dotProduct(velocity_AB, t);
        t.mult(t_scalarprodukt);
        t.normalize();

        ball.accel.add(std.addVector(std.multVector(normal, (0.8*j/ball.mass)), std.multVector(t, (0.05*-j/ball.mass))));
        box.accel.add(std.addVector(std.multVector(normal, (-j/box.mass)), std.multVector(t, (0.05*j/box.mass))));
        ball.angAccel += std.dotProduct(rA_perp, std.multVector(t, 0.05*-j/ball.inertia));
        box.angAccel += std.dotProduct(rBP_perp, std.addVector(std.multVector(normal, -j/box.inertia), std.multVector(t, 0.05*j/box.inertia)));
    }
}

export function checkCollision(shapes: Shape[]) {
    for (let i = 0; i < shapes.length; i++) {    
        for (let j = i+1; j < shapes.length; j++ ) {
            //Shadow berechnen von Element i und Element j 
            let shadow_i = createShadow(shapes[i]);
            let shadow_j = createShadow(shapes[j]);
            //Überschneidung prüfen
            if (shadow_i.maxX >= shadow_j.minX && shadow_i.minX <= shadow_j.maxX && shadow_i.maxY >= shadow_j.minY && shadow_i.minY <= shadow_j.maxY) {  
                //dann Überschneidung
                // Testcode
                //lb2d.line(shapes[i].location.x, shapes[i].location.y, shapes[j].location.x, shapes[j].location.y)
                // Ende Testcode
    
                if (shapes[i].typ == "Ball") {
                    if (shapes[j].typ == "Ball") {
                        let normal = detectCollisionBall(shapes[i], shapes[j]);
                        if (normal) {
                            resolveCollisionBall(shapes[i], shapes[j], normal);
                        }
                    } else {
                        let [cp, normal] = detectCollisionBallBox(shapes[i],shapes[j]);
                        if (cp && normal) {
                            resolveCollisionBallBox(shapes[i],shapes[j], cp, normal);
                        }
                    }
                }
            
                if (shapes[i].typ == "Box") {
                    if (shapes[j].typ == "Box") {
                        // beide Boxen müssen geprüft werden, ob sie auf
                        // die jeweils andere trefen könnte
                        let [cp, normal] = detectCollisionBox(shapes[i], shapes[j]);
                        if (cp && normal) {
                            resolveCollisionBox(shapes[i], shapes[j], cp, normal);  
                        } else {
                            let [cp, normal] = detectCollisionBox(shapes[j], shapes[i]);    
                            if (cp && normal) {
                                resolveCollisionBox(shapes[j], shapes[i], cp, normal);
                            }
                        }
                    } else {
                        let [cp, normal] = detectCollisionBallBox(shapes[j], shapes[i]);
                        if (cp && normal) {
                            resolveCollisionBallBox(shapes[j], shapes[i], cp, normal);
                        }
                    }            
                }
            }

        }
    }
}

export function checkWalls(shapes: Shape[], walls: Shape[]) {
    for (let i = 0; i < shapes.length; i++) {    
        for (let j = 0; j < walls.length; j++ ) {
            //Shadow berechnen von Element i und Element j 
            let shadow_i = createShadow(shapes[i]);
            let shadow_j = createShadow(walls[j]);
            //Überschneidung prüfen
            if (shadow_i.maxX >= shadow_j.minX && shadow_i.minX <= shadow_j.maxX && shadow_i.maxY >= shadow_j.minY && shadow_i.minY <= shadow_j.maxY) {  
                //dann Überschneidung
                // Testcode
                //lb2d.line(shapes[i].location.x, shapes[i].location.y, shapes[j].location.x, shapes[j].location.y)
                // Ende Testcode
    
                if (shapes[i].typ == "Ball") {
                    let [cp, normal] = detectCollisionBallBox(shapes[i],walls[j]);
                    if (cp && normal) {
                        resolveCollisionBallBox(shapes[i],walls[j], cp, normal);
                    }
                }
            
                if (shapes[i].typ == "Box") {
                    let [cp, normal] = detectCollisionBox(shapes[i], walls[j]);
                    if (cp && normal) {
                        resolveCollisionBox(shapes[i], walls[j], cp, normal);  
                    } else {
                        let [cp, normal] = detectCollisionBox(walls[j], shapes[i]);   
                        if (cp &&  normal) {
                            resolveCollisionBox(shapes[i], walls[j], cp, normal); 
                        }     
                    }          
                }
            }
        }
    }
}

/** 
 * @returns KickingFunction
*/
export function createKicking(): (shapes: Shape[]) => void {
    let index:number|null = null;
    let base = new std.Vector(0, 0);
    
    return function(shapes) {
        if (std.isMouseDown() && index == null) {
            shapes.forEach((shape, idx) => {
                if (shape.location.dist(new std.Vector(std.mouseX, std.mouseY)) < 15) {
                  base.set(shape.location.x, shape.location.y);
                  index = idx;
                }
            })  
            return;  
        }
    
        if (std.isMouseDown() && index != null) {
            std.drawArrow(base, new std.Vector(std.mouseX, std.mouseY), 100);
            return;
        }  
    
        if (std.isMouseUp() && index != null) {
            let mouse = new std.Vector(std.mouseX, std.mouseY);
            let force = std.subVector(mouse, shapes[index].location);
            force.mult(3);
            shapes[index].applyForce(force, 0);
            index = null;
            return;
        }      
    }
}

function createShadow(shape:Shape) {
    let shadow: {minX:number, maxX:number, minY:number, maxY:number};
    if (shape.typ == "Ball") {
        shadow = {minX:shape.location.x - shape.radius, maxX:shape.location.x + shape.radius, minY:shape.location.y - shape.radius, maxY:shape.location.y + shape.radius}
    } else {
        shadow = {minX:Infinity, maxX:-Infinity, minY:Infinity, maxY:-Infinity}
        for (let i = 0; i < 4; i++) {
            if (shape.vertices[i].x < shadow.minX) {
                shadow.minX = shape.vertices[i].x;
            } 
            if (shape.vertices[i].y < shadow.minY) {
                shadow.minY = shape.vertices[i].y;
            } 
            if (shape.vertices[i].x > shadow.maxX) {
                shadow.maxX = shape.vertices[i].x;
            } 
            if (shape.vertices[i].y > shadow.maxY) {
                shadow.maxY = shape.vertices[i].y;
            } 
        }    
    }
    return shadow;
}

 export function applyFriction(shapes: Shape[]) {
    shapes.forEach(shape => {
        let frictForce = shape.velocity.copy();
        frictForce.normalize();
        frictForce.mult(COEFFICIENT * -1); // in Gegenrichtung
        frictForce.limit(shape.velocity.mag());

        let frictAngDirection = shape.angVelocity < 0 ? 1 : -1; // in Gegenrichtung
        let frictAngForce = utils.limitNum(COEFFICIENT * 0.05 * frictAngDirection, Math.abs(shape.angVelocity));

        shape.applyForce(frictForce, frictAngForce);
    });
}

export function applyGravity(shapes: Shape[]) {
    shapes.forEach(shape => {
        if (shape.mass != Infinity) {
            shape.applyForce(std.multVector(GRAVITY, shape.mass), 0);
        }
    });
}

export function applyDragforce(shapes: Shape[]) {
    shapes.forEach((shape) => {
        // Magnitude is coefficient * speed squared
        let speedSq = shape.velocity.magSq();
        let dragMagnitude = 0.3 * speedSq;

        // Direction is inverse of velocity
        let dragForce = shape.velocity.copy();
        dragForce.mult(-1);

        let dragAngDirection = shape.angVelocity < 0 ? 1 : -1; // in Gegenrichtung
        let dragAngForce = utils.limitNum(0.001 * speedSq * dragAngDirection, Math.abs(shape.angVelocity))

        // Scale according to magnitude
        // dragForce.setMag(dragMagnitude);
        dragForce.normalize();
        dragForce.mult(dragMagnitude);
        shape.applyForce(dragForce, dragAngForce);
    })
    
}

export function update(shapes:Shape[]) {
    shapes.forEach(element => {
        if (element.typ != "Wall") {
            element.update();
        }
        element.display();
    });
}
