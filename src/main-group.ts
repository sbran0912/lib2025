import * as std from './lib-std.ts';
import * as utils from './lib-utils.ts';
import { Vehicle } from './vehicel.ts';

function setup() {
  std.createP("Linke Maustaste drücken ...")
  for (let i = 0; i < 100; i++) {
    vehicles.push(new Vehicle(utils.random(0, std.getWidth()), utils.random(0, std.getHeight()), 8));
  }
}

function draw() {
  std.background("whitesmoke");
  for (const v of vehicles) {
    v.separate(vehicles, 0.5);
    v.allign(vehicles, 0.2);
    v.cohesion(vehicles, 0.5);
    if (std.isMouseDown()) {
      v.seek(new std.Vector(std.mouseX, std.mouseY), 0.8);
    }
    v.update();
    v.display();
  }
}

// ---- Start ------
let vehicles: Vehicle[] = [];

std.init(800, 500);
setup();
std.startAnimation(draw);