export class Box {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial>;
  width: number;
  depth: number;
  direction: string;

  public constructor(init?: Partial<Box>) {
    Object.assign(this, init);
  }
}