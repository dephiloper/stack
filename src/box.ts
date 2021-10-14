export class Box {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial>;
  body: CANNON.Body;
  width: number;
  depth: number;
  direction: string;

  public constructor(init?: Partial<Box>) {
    Object.assign(this, init);
  }
}