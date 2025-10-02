import * as std from './lib-std.ts'
import * as gen from './genetic.ts';

function draw() {
    std.background("powderblue");
  
    gen.drawFood(food, "DarkGreen");
    gen.drawFood(poison, "red");
  
    for (let i = vehics.length-1; i >= 0; i--) {
      //Verlust Lebensenergie
      if (Math.random() < 0.015) {
        vehics[i].health -= 0.05;
      } 
      vehics[i].eatFood(food, true);
      vehics[i].eatFood(poison, false);
      vehics[i].boundaries();
      vehics[i].update();
      vehics[i].draw();  
      
      //console.log(i, vehics[i].health.toFixed(1));
      if (vehics[i].dead()) {
        vehics.splice(i, 1);
      }
    }
     //Cloning
    if (Math.random() < 0.0008) {
      for (let i = vehics.length-1; i >= 0; i--) {
        vehics.push(new gen.Vehicle(300, 300, 10, vehics[i].dna));
      }
    } 
  
    // Futternachschub
      gen.respawnFood(food, 30, 20);
      gen.respawnFood(poison, 30, 20);  
  
}

function start() {
  food = gen.createFood(50);
  poison = gen.createFood(50);
  vehics = [];

  for (let i = 0; i < 5; i++) {
    vehics.push(new gen.Vehicle(300, 300, 10));
  }
  
  std.createCheckbox('debug', 'Debug Modus');
  const debugCheckbox = document.querySelector('input[name="debug"]') as HTMLInputElement;
  debugCheckbox.addEventListener('change', (e: Event) => {
    const targetElement = e.target as HTMLInputElement;
    if (targetElement.checked) {
      gen.updDebugStatus(true);
    } else {
      gen.updDebugStatus(false);
    }
  });
}

// Programmstart
let food: std.Vector[];
let poison: std.Vector[];
let vehics: gen.Vehicle[];

std.init(800, 500);
start();
std.startAnimation(draw);

