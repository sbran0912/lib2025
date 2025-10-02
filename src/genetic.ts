import * as std from './lib-std.ts';
import * as utils from './lib-utils.ts'

let debug:boolean = false;

export class Vehicle {

    location: std.Vector;
    velocity: std.Vector;
    accel: std.Vector;
    heading: std.Vector;
    radius: number;
    max_steer: number;
    max_desired: number;
    health: number;
    dna: number[];
  
    /**
     * 
     * @param x-pos
     * @param y-pos   
     * @param radius
     * @param mother_dna
     */
    constructor(x:number, y:number, r:number, mother_dna?:number[]) {
        this.location = new std.Vector(x, y);
        this.velocity = new std.Vector(-1 + Math.random() * 3, -1 + Math.random() * 3);
        this.accel = new std.Vector(0, 0);
        this.heading = new std.Vector(0, 0);
        this.radius = r;
        this.max_steer = 1.0;
        this.max_desired = 1.0;
        this.health = 1.0;
        this.dna = [];
        if (mother_dna == undefined) {
            this.dna[0] = utils.randomFloat(-1.0, 1.0); // Force to Food
            this.dna[1] = utils.randomFloat(-1.0, 1.0); // Force to Poison
            this.dna[2] = utils.random(20, 100); // Radius to Food
            this.dna[3] = utils.random(20, 100); // Radius to Poison
        } else {
            //Mutation
            this.dna[0] = mother_dna[0];
            this.dna[0] += utils.randomFloat(-0.1, 0.1);
            
            this.dna[1] = mother_dna[1];
            this.dna[1] += utils.randomFloat(-0.1, 0.1);
            
            this.dna[2] = mother_dna[2];
            this.dna[2] += utils.random(-10, 10);
            
            this.dna[3] = mother_dna[3];
            this.dna[3] += utils.random(-10, 10);
        }
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

        let color_vehic = "white";
        if (this.health < 0.6) {
            color_vehic = "orange";
        }
        if (this.health < 0.3) {
            color_vehic = "red";
        }
   
        std.strokeColor(color_vehic);
        std.fillColor(color_vehic);
        std.triangle(points[0].x, points[0].y, points[1].x, points[1].y, points[2].x, points[2].y, 2);
        if (debug) {
            std.strokeColor("Green"); // green for food 
            std.circle(points[0].x, points[0].y, this.dna[2], 0);
            std.strokeColor("red"); // red for Poison 
            std.circle(points[0].x, points[0].y, this.dna[3], 0);
        }
    }

    update() {
        this.velocity.add(this.accel);
        this.velocity.limit(6);
        this.accel.set(0,0);
        this.location.add(this.velocity);
    }

    applyForce(force: std.Vector) {
        force.div(this.radius*2);
        this.accel.add(force);
    }

    seek(target: std.Vector, dna: number) {
        const desired = std.subVector(target, this.location);
        desired.setMag(this.max_desired);
        desired.mult(dna);
        const steer = std.subVector(desired, this.velocity);
        steer.mult(this.max_steer);
        this.applyForce(steer);
    }

    eatFood(food: std.Vector[], is_good: boolean) {
        let mindist = Infinity;
        let idx = -1;

        for (let i = food.length-1; i >=0; i--) {
            let distance = this.location.dist(food[i]); //Distanz des Vehicles zum Futter
            let radius = is_good ? this.dna[2] : this.dna[3];
            if (distance < radius && distance < mindist) { //kleiner als Sichtradius und kleinste Distanz bisher
                mindist = distance;
                idx = i;
            }
        }

        if (idx > -1) {
            if (this.location.dist(food[idx]) < 3) {
                food.splice(idx,1);
                if (is_good) {
                    this.health += 0.1
                } else {
                    this.health -= 0.1
                }
            } else {
                std.strokeColor("white");
                std.circle(food[idx].x,food[idx].y, 5, 0);
                this.seek(food[idx], (is_good ? this.dna[0] : this.dna[1]));
            }
        }
    }

    dead(): boolean {
        if (this.health < 0) {
            return true;
        } else {
            return false;
        }
    }

    boundaries() {
        if (this.location.x < 0 || this.location.x > std.getWidth()) {
            this.velocity.x *= -1;
        }

        if (this.location.y < 0 || this.location.y > std.getHeight()) {
            this.velocity.y *= -1;
        }    
    }
}



export function createFood(count: number): std.Vector[] {
    const food = [];
    for (let i = 0; i < count; i++) {
        food.push(new std.Vector(utils.random(1, std.getWidth()), utils.random(1, std.getHeight())));  
    }
    return food;
}

export function respawnFood(food: std.Vector[], min: number, count: number) {
    if (food.length < min) {
        for (let i = 0; i < count; i++) {
        food.push(new std.Vector(utils.random(1, std.getWidth()), utils.random(1, std.getHeight())));  
        }
    }
}

export function drawFood(food: std.Vector[], color: string) {
    food.forEach(el => {
        std.fillColor(color);
        std.circle(el.x, el.y, 1.5, 1);
    });
}

export function updDebugStatus(status: boolean) {
    debug = status;
}
