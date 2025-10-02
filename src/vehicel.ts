import * as std from './lib-std.ts';
//import * as utils from './lib-utils.ts'

export class Vehicle {
    location: std.Vector;
    velocity: std.Vector;
    accel: std.Vector;
    radius: number;
    max_steer: number;
    max_desired: number;
  
    /**
     * 
     * @param x-pos
     * @param y-pos   
     * @param radius
     */
    constructor(x:number, y:number, r:number) {
        this.location = new std.Vector(x, y);
        this.velocity = new std.Vector(-1 + Math.random() * 3, -1 + Math.random() * 3);
        this.accel = new std.Vector(0, 0);
        this.radius = r;
        this.max_steer = 0.8;
        this.max_desired = 6.0;
    }

    draw() {
        const points: std.Vector[] = new Array(3);
        const vel = this.velocity.copy();
        vel.setMag(this.radius);
        const back = std.subVector(this.location, vel);
        const vel_perp = new std.Vector(-(vel.y), vel.x);
        vel_perp.setMag(this.radius/2);
        
        points[0] = this.location;
        points[1] = std.addVector(back, vel_perp);
        points[2] = std.subVector(back, vel_perp);
   
        std.strokeColor("black");
        std.fillColor("black");
        std.triangle(points[0].x, points[0].y, points[1].x, points[1].y, points[2].x, points[2].y, 2);
    }

    update() {
        this.velocity.add(this.accel);
        this.velocity.limit(20);
        this.accel.set(0,0);
        this.location.add(this.velocity);
    }

    applyForce(force: std.Vector) {
        force.div(this.radius*2);
        this.accel.add(force);
    }

    seek(target: std.Vector) {
        const desired = std.subVector(target, this.location);
        desired.setMag(this.max_desired);
        const steer = std.subVector(desired, this.velocity);
        steer.mult(this.max_steer);
        this.applyForce(steer);
    }
}