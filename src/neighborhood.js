import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

/**
 * SMALL POLES — Ghanaian neighbourhood dressing.
 * Lightweight procedural scenery, built from Three.js primitives so the game
 * does not need external models or textures.
 */
export function addNeighborhood(THREE, scene, venue = "accra") {
  const root = new THREE.Group();
  root.name = "small-poles-neighbourhood";
  scene.add(root);

  const material = (color, roughness = 0.92, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const m = {
    plaster: ["#d5b68b", "#c8a17a", "#dfc69e", "#aeb39a", "#e2d4b8"].map(c => material(c)),
    concrete: material("#8a8273"),
    darkConcrete: material("#5b554b"),
    roof: ["#7a4432", "#5a5146", "#8a5941", "#4a4b43"].map(c => material(c)),
    rust: material("#874b36"),
    metal: material("#3d4038", .7, .25),
    window: material("#25352f", .5),
    windowLit: material("#c9a66c", .7),
    door: material("#49352a"),
    blue: material("#426f85"),
    yellow: material("#d5ad39"),
    green: material("#397a4d"),
    red: material("#b94a3e"),
    white: material("#e7dfc9"),
    black: material("#252620"),
    leaf: ["#386642", "#47784a", "#28543a"].map(c => material(c)),
    trunk: material("#66503a"),
    kiosk: material("#c2a16c"),
    kioskShade: material("#4a6e5a"),
    wire: material("#252b28", .65),
    skin: ["#78472e", "#925b3b", "#603a28", "#a16a43"].map(c => material(c)),
    shirt: ["#d8b43a", "#3c8454", "#bd5141", "#527f9b", "#e0d7bd"].map(c => material(c))
  };

  function box(parent, size, mat, pos, rot = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent, rTop, rBottom, height, mat, pos, radial = 7) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, height, radial), mat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function wire(a, b, radius = .025) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 5), m.wire);
    mesh.position.copy(start.clone().add(end).multiplyScalar(.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    root.add(mesh);
    return mesh;
  }

  // Dusty ground apron beyond the court, visually merging into the distance.
  const apronColors = { accra: "#ad8b61", jamestown: "#b69b78", kumasi: "#9d9668" };
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: apronColors[venue] || apronColors.accra, roughness: 1 })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, -.39, 0);
  apron.receiveShadow = true;
  root.add(apron);

  // Low perimeter compounds and irregular, lived-in Ghanaian houses.
  function house(x, z, w, d, h, variant = 0, facing = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    root.add(g);
    const wallMat = m.plaster[variant % m.plaster.length];
    box(g, [w, h, d], wallMat, [0, h / 2 - .08, 0]);
    // Flat roof with a raised parapet and occasional water tank.
    box(g, [w + .16, .18, d + .16], m.concrete, [0, h + .01, 0]);
    box(g, [w + .08, .16, .13], m.darkConcrete, [0, h + .14, -d / 2 + .04]);
    // Door and two shaded windows on the face pointing toward the court.
    const frontZ = facing > 0 ? d / 2 + .012 : -d / 2 - .012;
    box(g, [w * .19, h * .48, .07], m.door, [-w * .22, h * .24, frontZ]);
    box(g, [w * .23, h * .23, .08], m.window, [w * .2, h * .58, frontZ]);
    box(g, [w * .25, .055, .11], m.white, [w * .2, h * .58, frontZ * 1.015]);
    box(g, [.055, h * .27, .11], m.white, [w * .2, h * .58, frontZ * 1.015]);
    // Small ventilation blocks beneath the roofline.
    for (let i = -1; i <= 1; i++) {
      box(g, [.13, .07, .035], m.darkConcrete, [i * w * .2, h - .34, frontZ * 1.01]);
    }
    if (variant % 2 === 0) {
      cylinder(g, .38, .42, .75, m.metal, [w * .28, h + .55, -d * .15], 10);
      box(g, [.9, .1, .75], m.darkConcrete, [w * .28, h + .15, -d * .15]);
    }
    return g;
  }

  // Background rows deliberately sit beyond the enclosing walls, so they read
  // as a neighbourhood rather than cluttering the playable court.
  house(-17.5, -19, 7.2, 4.8, 5.3, 0, 1);
  house(-7.8, -21.8, 7.5, 5.4, 4.5, 2, 1);
  house(3.0, -22.4, 8.3, 5.6, 6.1, 1, 1);
  house(15.0, -19.8, 7.8, 5.1, 4.8, 3, 1);
  house(-18.2, 19.0, 7.4, 5.1, 4.9, 2, -1);
  house(-7.0, 22.0, 8.4, 5.4, 6.2, 0, -1);
  house(5.0, 21.5, 7.8, 5.0, 4.6, 3, -1);
  house(16.4, 20.0, 7.0, 5.3, 5.5, 1, -1);
  house(-19.6, -7.0, 4.8, 6.6, 3.9, 4, 1);
  house(19.5, 7.0, 4.9, 6.2, 4.3, 2, -1);
  // Extra close-set compound houses sit just beyond the touchlines, high enough
  // to remain visible above the court walls from the gameplay camera.
  house(-14.4, -8.0, 4.6, 5.2, 6.2, 1, 1);
  house(14.4, -8.0, 4.6, 5.2, 6.2, 3, 1);
  house(-14.4, 8.0, 4.6, 5.2, 6.2, 0, 1);
  house(14.4, 8.0, 4.6, 5.2, 6.2, 2, 1);

  // Painted compound walls, gate posts and a few patched sections.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const z = -16 + i * 7.7;
      box(root, [.34, 1.55, 6.7], i % 2 ? m.plaster[1] : m.concrete, [side * 14.1, .4, z]);
      box(root, [.42, .16, 6.85], m.darkConcrete, [side * 14.1, 1.22, z]);
    }
  }

  // A little roadside provision kiosk with striped awning and counter.
  function kiosk(x, z, rot = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    root.add(g);
    box(g, [3.0, 2.25, 2.0], m.kiosk, [0, 1.12, 0]);
    box(g, [3.25, .14, 2.25], m.kioskShade, [0, 2.28, 0]);
    for (let i = 0; i < 6; i++) {
      box(g, [.5, .08, 2.26], i % 2 ? m.white : m.red, [-1.25 + i * .5, 2.38, 0]);
    }
    box(g, [2.65, .75, .12], m.window, [0, 1.45, 1.02]);
    box(g, [2.9, .14, .22], m.door, [0, .98, 1.08]);
    box(g, [2.7, .09, .55], m.door, [0, .92, 1.28]);
    // Sachet water / drink crates, kept as a colourful small cluster.
    for (let i = 0; i < 4; i++) {
      box(g, [.42, .34, .4], [m.blue, m.red, m.green, m.yellow][i], [-.9 + i * .6, .24, 1.35]);
    }
  }
  kiosk(-16.5, 7.0, Math.PI / 2);
  kiosk(16.8, -7.0, -Math.PI / 2);

  // Utility poles, cross arms and sagging overhead wires.
  const polePoints = [
    [-21, -16], [-21, 1], [-21, 17],
    [21, -17], [21, 0], [21, 17],
    [-10, -27], [10, -27]
  ];
  const tops = [];
  polePoints.forEach(([x, z], i) => {
    const h = i % 3 === 0 ? 8.6 : 7.3;
    cylinder(root, .105, .17, h, i % 2 ? m.concrete : m.trunk, [x, h / 2 - .05, z], 7);
    box(root, [1.5, .11, .12], m.metal, [x, h - .35, z]);
    for (const dx of [-.58, 0, .58]) {
      cylinder(root, .035, .035, .3, m.metal, [x + dx, h - .15, z], 5);
    }
    tops.push([x, h - .05, z]);
  });
  for (let i = 0; i < tops.length - 1; i++) {
    if (i === 2 || i === 5) continue;
    const a = tops[i], b = tops[i + 1];
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - .65, (a[2] + b[2]) / 2];
    wire(a, mid, .018); wire(mid, b, .018);
  }

  // Tropical greenery: broad-leaf palms and hardy compound-yard trees.
  function palm(x, z, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    root.add(g);
    cylinder(g, .14, .23, 3.6, m.trunk, [0, 1.8, 0], 7);
    const crown = new THREE.Vector3(0, 3.45, 0);
    for (let i = 0; i < 9; i++) {
      const angle = i * Math.PI * 2 / 9;
      const length = 1.2 + (i % 3) * .12;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(.22, length, 5), m.leaf[i % 3]);
      leaf.position.set(Math.cos(angle) * .48, 3.38 - (i % 2) * .1, Math.sin(angle) * .48);
      leaf.rotation.z = Math.cos(angle) * .95;
      leaf.rotation.x = Math.sin(angle) * .95;
      leaf.rotation.y = -angle;
      leaf.castShadow = true;
      g.add(leaf);
    }
    cylinder(g, .34, .4, .18, m.leaf[1], [0, 3.2, 0], 8);
  }
  palm(-13.5, -21, 1.15);
  palm(12.5, -23, 1.0);
  palm(-13.8, 22, .9);
  palm(13.6, 23, 1.05);
  palm(-21.5, 9, .8);
  palm(21.5, -8, .85);

  // Tiny spectators on the safe side of the end walls: heads and shirts peek
  // above the brickwork and give the match a local crowd silhouette.
  function spectator(x, z, colorIndex, scale = 1) {
    const g = new THREE.Group();
    // Raise the crowd slightly so heads and shoulders clear the 3.2m wall.
    g.position.set(x, 1.9, z);
    g.scale.setScalar(scale);
    root.add(g);
    cylinder(g, .17, .19, .58, m.shirt[colorIndex % m.shirt.length], [0, 1.25, 0], 7);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.17, 9, 7), m.skin[colorIndex % m.skin.length]);
    head.position.set(0, 1.72, 0);
    head.castShadow = true;
    g.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.175, 8, 6, 0, Math.PI * 2, 0, Math.PI * .55), m.black);
    hair.position.set(0, 1.77, 0);
    g.add(hair);
    // Arms held casually at the sides.
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(.045, .055, .48, 6), m.skin[colorIndex % m.skin.length]);
      arm.position.set(side * .22, 1.23, 0);
      arm.rotation.z = side * -.12;
      g.add(arm);
    }
  }
  for (let i = 0; i < 13; i++) {
    spectator(-8.8 + i * 1.45, -16.25 - (i % 2) * .12, i, .78 + (i % 3) * .08);
    spectator(-8.1 + i * 1.32, 16.25 + (i % 2) * .12, i + 2, .76 + (i % 4) * .06);
  }

  // Scattered stones, sacks and plastic basins around the outer edge only.
  for (let i = 0; i < 34; i++) {
    const side = i % 2 ? -1 : 1;
    const x = side * (13.0 + Math.random() * 3.2);
    const z = (Math.random() - .5) * 34;
    const mesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(.09 + Math.random() * .12, 0),
      [m.concrete, m.kiosk, m.blue, m.darkConcrete][i % 4]
    );
    mesh.position.set(x, -.12, z);
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    mesh.castShadow = true;
    root.add(mesh);
  }

  return root;
}
