import * as std from './lib-std.ts';
//import * as utils from './lib-utils.ts';
import { Vehicle } from './vehicel.ts';

function draw() {
  std.background("whitesmoke");

  target.set(std.mouseX, std.mouseY);
  std.fillColor("red");
  std.circle(target.x, target.y, 10, 1);

  vec.seek(target);
  vec.update();
  vec.draw();
}

function start() {
  vec = new Vehicle(200, 100, 10);
  target = new std.Vector(0, 0);
  vec.velocity = new std.Vector(15, -5);
}

// Globale Variablen
let vec: Vehicle;
let target: std.Vector;

//Start
std.init(800, 500);
start();
std.startAnimation(draw);


