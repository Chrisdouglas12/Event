import type * as THREE from "three";

export type TravelModelKind = "aircraft" | "ship" | "car";

/**
 * Models are hosted locally so the landing page never depends on a third-party
 * CDN at runtime. See public/models/ATTRIBUTION.md for sources and licences.
 */
const MODEL_URLS: Record<TravelModelKind, string> = {
  aircraft: "/models/airliner.glb",
  ship: "/models/ship.glb",
  car: "/models/sports-car.glb",
};

type ThreeModule = typeof import("three");

/** Load one realistic GLB and centre/scale it for the travel lanes. */
export async function loadTravelModel(
  THREE: ThreeModule,
  kind: TravelModelKind
): Promise<THREE.Object3D> {
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(MODEL_URLS[kind]);

  const model = gltf.scene;
  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => (m.side = THREE.DoubleSide));
      else if (mat) mat.side = THREE.DoubleSide;
    }
  });

  return model;
}

/**
 * Clone a loaded model and normalise its longest horizontal dimension to the
 * requested size. The returned group is already centred on the origin.
 */
export function createModelInstance(
  THREE: ThreeModule,
  source: THREE.Object3D,
  targetSize: number
): THREE.Group {
  const wrapper = new THREE.Group();
  const model = source.clone(true);
  wrapper.add(model);

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / longest;
  model.scale.setScalar(scale);

  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);

  // Most GLB vehicles are modelled along Z; rotate them so their long axis
  // follows the X travel lane. Lanes that need the opposite heading simply
  // rotate the wrapper by PI in the scene setup.
  if (size.z > size.x) wrapper.rotation.y = Math.PI / 2;

  return wrapper;
}

/** Lightweight silhouettes used only if a GLB cannot be loaded. */
export function createFallbackModel(
  THREE: ThreeModule,
  kind: TravelModelKind
): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: kind === "ship" ? 0x9fb6c8 : kind === "car" ? 0x8ee3d6 : 0xe8f3f2,
    metalness: 0.35,
    roughness: 0.45,
  });

  if (kind === "aircraft") {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 1.8, 4, 10), mat);
    body.rotation.z = Math.PI / 2;
    group.add(body);
    const wings = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 1.6), mat);
    group.add(wings);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.4), mat);
    tail.position.x = -0.85;
    group.add(tail);
  } else if (kind === "ship") {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.32, 0.65), mat);
    group.add(hull);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.5), mat);
    bridge.position.set(-0.75, 0.35, 0);
    group.add(bridge);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 0.65), mat);
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.55), mat);
    cabin.position.set(-0.1, 0.28, 0);
    group.add(cabin);
  }

  return group;
}
