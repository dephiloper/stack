import * as THREE from "three";
import * as CANNON from "cannon";
import { Box } from "./box";
import { Clock } from "three";
import { Quaternion, Vector3 } from "three";

const boxHeight: number = 1;
const originalBoxSize: number = 3;

class Game {
  camera: THREE.Camera;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  stack: Array<Box> = new Array<Box>();
  overhangs: Array<Box> = new Array<Box>();
  gameStarted: boolean = false;
  world: CANNON.World;
  lastTime: number = 0;
  clock: Clock = new Clock();
  speed: number = 10;

  public init(): void {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -10, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 40;

    this.scene = new THREE.Scene();
    this.addLayer(0, 0, originalBoxSize, originalBoxSize);
    this.addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");

    this.camera = this.setupCamera();
    this.setupLight();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.render(this.scene, this.camera);

    document.body.appendChild(this.renderer.domElement);

    window.addEventListener("click", (ev: MouseEvent) => this.onMouseClick(ev));

    this.renderer.setAnimationLoop(this.animation.bind(this));
  }

  private onMouseClick(ev: MouseEvent): any {
    if (!this.gameStarted) {
      this.gameStarted = true;
    } else {
      const topLayer: Box = this.stack[this.stack.length - 1];
      const preLayer: Box = this.stack[this.stack.length - 2];
      const direction = topLayer.direction;

      const delta: number = topLayer.mesh.position[direction] - preLayer.mesh.position[direction];
      const size = direction === "x" ? topLayer.width : topLayer.depth;
      const overhang: number = Math.abs(delta);
      const overlap = size - overhang;

      if (overlap > 0) {
        this.cutBox(topLayer, overlap, size, delta);

        // overhang
        const overhangShift = (overlap / 2 + overhang / 2) * Math.sign(delta);
        const overhangX = direction === "x" ? topLayer.mesh.position.x + overhangShift : topLayer.mesh.position.x;
        const overhangZ = direction === "z" ? topLayer.mesh.position.z + overhangShift : topLayer.mesh.position.z;
        const overhangWidth = direction === "x" ? overhang : topLayer.width;
        const overhangDepth = direction === "z" ? overhang : topLayer.depth;

        this.addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

        const nextX = topLayer.direction === "x" ? topLayer.mesh.position.x : -10;
        const nextZ = topLayer.direction === "z" ? topLayer.mesh.position.z : -10;
        const newWidth: number = topLayer.width;
        const newDepth: number = topLayer.depth;
        this.addLayer(nextX, nextZ, newWidth, newDepth, topLayer.direction === "x" ? "z" : "x");
      }
    }
  }

  private setupCamera(): THREE.Camera {
    // camera
    const ratio: number = window.innerHeight / window.innerWidth;
    const width: number = 40;
    const height: number = width * ratio;

    const camera = new THREE.OrthographicCamera(
      width / -2,
      width / 2,
      height / 2,
      height / -2,
      1,
      100
    );

    camera.position.set(4, 4, 4);
    camera.lookAt(0, 0, 0);
    
    camera.position.y += 6;
    return camera;
  }

  private setupLight(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 20, 0);
    this.scene.add(directionalLight);
  }

  private addLayer(x: number, z: number, width: number, depth: number, direction: string = "z"): void {
    const y: number = boxHeight + this.stack.length;
    const layer: Box = this.generateBox(x, y, z, width, depth, false);
    layer.direction = direction;
    this.stack.push(layer);
  }

  private addOverhang(x: number, z: number, width: number, depth: number) {
    const y: number = boxHeight + (this.stack.length - 1);
    const overhang: Box = this.generateBox(x, y, z, width, depth, true);
    this.overhangs.push(overhang);
  }

  private cutBox(topLayer: Box, overlap: number, size: number, delta: number) {
    const direction = topLayer.direction;
    const newWidth = direction == "x" ? overlap : topLayer.width;
    const newDepth = direction == "z" ? overlap : topLayer.depth;

    // Update metadata
    topLayer.width = newWidth;
    topLayer.depth = newDepth;

    // Update ThreeJS model
    topLayer.mesh.scale[direction] = overlap / size;
    topLayer.mesh.position[direction] -= delta / 2;

    // Update CannonJS model
    topLayer.body.position[direction] -= delta / 2;

    // Replace shape to a smaller one (in CannonJS you can't simply just scale a shape)
    const shape = new CANNON.Box(
      new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
    );
    topLayer.body.shapes = [];
    topLayer.body.addShape(shape);
  }

  private generateBox(x: number, y: number, z: number, width: number, depth: number, falls: boolean): Box {
    // add cube to scene
    const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
    const color = new THREE.Color(`hsl(${30 + this.stack.length * 4}, 100%, 50%)`);
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    const shape = new CANNON.Box(
      new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2) // dist from center to side
    );

    let mass: number = falls ? 5 : 0;
    const body = new CANNON.Body({ mass, shape });
    this.world.addBody(body);
    body.position.set(x, y, z);
    return new Box({ mesh, body, width, depth });
  }

  private animation(): void {
    let delta = this.clock.getDelta();
    //delta = 0.02;

    if (this.gameStarted) {
      const topLayer: Box = this.stack[this.stack.length - 1];
      if (this.speed > 0 && topLayer.mesh.position[topLayer.direction] > 10) this.speed = -10;
      if (this.speed < 0 && topLayer.mesh.position[topLayer.direction] < -10) this.speed = 10;

      topLayer.mesh.position[topLayer.direction] += this.speed * delta;
      topLayer.body.position[topLayer.direction] += this.speed * delta;
  
      if (this.camera.position.y < boxHeight * (this.stack.length - 2) + 4) {
        this.camera.position.y += this.speed * delta;
      }
  
      this.updatePhysics(delta);
      this.renderer.render(this.scene, this.camera);
    }
  }

  private updatePhysics(delta: number) {
    this.world.step(delta);

    this.overhangs.forEach((overhang: Box) => {
      overhang.mesh.position.copy(new Vector3(overhang.body.position.x, overhang.body.position.y, overhang.body.position.z));
      overhang.mesh.quaternion.copy(new Quaternion(overhang.body.quaternion.x, overhang.body.quaternion.y, overhang.body.quaternion.z, overhang.body.quaternion.w));
    });
  }
}

const game = new Game();
game.init();