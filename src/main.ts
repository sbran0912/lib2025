import * as lb2d from './lib-2d.ts';
import * as phys from './lib-phys.ts';
import * as utils from './lib-utils.ts';

function draw() {
  lb2d.background("whitesmoke");
  checkKicking(shapes);
  phys.checkCollision(shapes);
  phys.checkWalls(shapes, walls);
  phys.applyGravity(shapes);
  //phys.applyFriction(shapes);
  //phys.applyDragforce(shapes);
  phys.update(shapes);
  phys.update(walls);
}

// Programmstart
let shapes: phys.Shape[] = [];
let walls: phys.Wall[] = [new phys.Wall(10, 480, 700, 10)];
let checkKicking = phys.createKicking();

shapes.push(new phys.Box(100, 200, 400, 20));
shapes[0].mass = Infinity;
shapes.push(
  new phys.Box(
    utils.random(10, 700),
    utils.random(10, 400),
    utils.random(10, 80),
    utils.random(10, 80)
  )
);
shapes.push(
  new phys.Box(
    utils.random(10, 700),
    utils.random(10, 400),
    utils.random(10, 80),
    utils.random(10, 80)
  )
);
shapes.push(
  new phys.Ball(
    utils.random(10, 700),
    utils.random(10, 400),
    utils.random(10, 80)
  )
);
shapes.push(
  new phys.Ball(
    utils.random(10, 700),
    utils.random(10, 400),
    utils.random(10, 30)
  )
);

lb2d.init(800, 500);
lb2d.strokeWidth(1.5);
lb2d.startAnimation(draw);

lb2d.createCheckbox('debug', 'Debug Modus');
const debugCheckbox = document.querySelector('input[name="debug"]') as HTMLInputElement;
const istDebugAktiv = debugCheckbox.checked;
console.log("Aktueller Zustand der Checkbox:", istDebugAktiv);

debugCheckbox.addEventListener('change', (e: Event) => {
  const targetElement = e.target as HTMLInputElement;
  if (targetElement.checked) {
    console.log("Debug-Modus wurde EINGESCHALTET. 🟢");
  } else {
    console.log("Debug-Modus wurde AUSGESCHALTET. 🔴");
  }
});