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
        this.max_steer = 1.2;
        this.max_desired = 6.0;
    }

    display() {
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
        this.velocity.limit(5);
        this.accel.set(0,0);
        this.location.add(this.velocity);
    }

    applyForce(force: std.Vector) {
        force.div(this.radius*2);
        this.accel.add(force);
    }

    /**
     * Seek-Force will be multiplied by weigth 
     */
    seek(target: std.Vector, weigth: number) {
        const desired = std.subVector(target, this.location);
        desired.setMag(this.max_desired);
        const steer = std.subVector(desired, this.velocity);
        steer.mult(this.max_steer * weigth);
        this.applyForce(steer);
    }

    /**
     * Separate-Force will be multiplied by weigth 
     */
    separate(vehicles: Vehicle[], weigth: number) {
        const minDistance = 40;
        const diff_sum = new std.Vector(0, 0);
        let count = 0;
        for (const other_vehicle of vehicles) {
            const distance = this.location.dist(other_vehicle.location);
            if (distance > 0 && distance < minDistance) {
                const diff = std.subVector(this.location, other_vehicle.location);
                diff.normalize();
                diff_sum.add(diff);
                count++;
            }
        }
        if (count > 0) {
            diff_sum.div(count); // average vector
            diff_sum.setMag(this.max_desired);
            const steer = std.subVector(diff_sum, this.velocity);
            steer.mult(this.max_steer * weigth);
            this.applyForce(steer);
        }
    }

    allign(vehicles: Vehicle[], weigth: number) {
        const minDistance = 50;
        let count = 0;
        const sum_vel = new std.Vector(0, 0);
        for (const other_vehicle of vehicles) {
            const distance = this.location.dist(other_vehicle.location);
            if (distance > 0 && distance < minDistance) {
                sum_vel.add(other_vehicle.velocity);
                count++;
            }
            
        }
        if (count > 0) {
            sum_vel.div(vehicles.length);
            sum_vel.setMag(this.max_desired);
            const steer = std.subVector(sum_vel, this.velocity);
            steer.mult(this.max_steer * weigth);
            this.applyForce(steer);
        }
    }

    cohesion(vehicles: Vehicle[], weigth: number) {
        const minDistance = 50;
        let count = 0;
        const sum_loc = new std.Vector(0, 0);
        for (const other_vehicle of vehicles) {
            const distance = this.location.dist(other_vehicle.location);
            if (distance > 0 && distance < minDistance) {
                sum_loc.add(other_vehicle.location);
                count++;
            }
        }
        if (count > 0) {
            sum_loc.div(vehicles.length);
            sum_loc.setMag(this.max_desired);
            const steer = std.subVector(sum_loc, this.velocity);
            steer.mult(this.max_steer * weigth);
            this.applyForce(steer);
        }
    }
}