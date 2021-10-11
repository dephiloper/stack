import * as THREE from "three";
import { Box } from "./box";

const boxHeight: number = 1;
const originalBoxSize: number = 3;

class Game {
  camera: THREE.Camera;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  stack: Array<Box> = new Array<Box>();
  gameStarted: boolean = false;

  public init(): void {
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
  }

  private onMouseClick(ev: MouseEvent): any {
    if (!this.gameStarted) {
      this.renderer.setAnimationLoop(this.animation.bind(this));
      this.gameStarted = true;
    } else {
      const topLayer: Box = this.stack[this.stack.length -1];
      const nextX = topLayer.direction === "x" ? 0 : -10;
      const nextZ = topLayer.direction === "z" ? 0 : -10;
      this.addLayer(nextX, nextZ, originalBoxSize, originalBoxSize, topLayer.direction === "x" ? "z" : "x");
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
    const layer: Box = this.generateBox(x, y, z, width, depth);
    layer.direction = direction;
    this.stack.push(layer);
  }

  private generateBox(x: number, y: number, z: number, width: number, depth: number): Box {
    // add cube to scene
    const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
    const color = new THREE.Color(`hsl(${30 + this.stack.length * 4}, 100%, 50%)`);
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    return new Box({ mesh, width, depth });
  }

  private animation(): void {
    const speed: number = 0.15;
    const topLayer: Box = this.stack[this.stack.length - 1];
    topLayer.mesh.position[topLayer.direction] += speed;

    if (this.camera.position.y < boxHeight * (this.stack.length - 2) + 4) {
      this.camera.position.y += speed;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

const game = new Game();
game.init();