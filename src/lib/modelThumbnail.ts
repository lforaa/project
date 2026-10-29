import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const OUTPUT_SIZE = 512;
const PROBE_SIZE = 96;
const BACKGROUND = 0xf8fafc; // slate-50, kart arka planıyla aynı
const FILL = 0.88; // modelin kareyi doldurma oranı
const PREFERRED_AZIMUTH = Math.PI / 4; // eşit puanda 3/4 ön görünüm tercih edilir

let renderer: THREE.WebGLRenderer | null = null;
let loader: GLTFLoader | null = null;
let envMap: THREE.Texture | null = null;

function init() {
  if (renderer && loader && envMap) return { renderer, loader, envMap };
  // Canvas DOM'a hiç eklenmez: tamamen gizli.
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.NeutralToneMapping;

  const pmrem = new THREE.PMREMGenerator(renderer);
  envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  return { renderer, loader, envMap };
}

function coverage(r: THREE.WebGLRenderer): number {
  const gl = r.getContext();
  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let n = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] > 8) n++;
  return n;
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of mats) {
      for (const v of Object.values(m as unknown as Record<string, unknown>)) {
        if (v instanceof THREE.Texture) v.dispose();
      }
      m.dispose();
    }
  });
}

function placeCamera(cam: THREE.PerspectiveCamera, center: THREE.Vector3, az: number, el: number, dist: number) {
  const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  cam.position.copy(center).addScaledVector(dir, dist);
  cam.lookAt(center);
  cam.updateMatrixWorld();
}

// Bounding box köşeleri kareye tam sığana kadar mesafeyi ayarlar.
function fitDistance(cam: THREE.PerspectiveCamera, center: THREE.Vector3, corners: THREE.Vector3[], az: number, el: number, start: number) {
  let dist = start;
  for (let i = 0; i < 8; i++) {
    placeCamera(cam, center, az, el, dist);
    let m = 0;
    for (const c of corners) {
      const v = c.clone().project(cam);
      m = Math.max(m, Math.abs(v.x), Math.abs(v.y));
    }
    dist *= m / FILL;
  }
  return dist;
}

// Dönüş: [önden, arkadan]
async function renderThumbnail(url: string): Promise<string[]> {
  const { renderer: r, loader: l, envMap: env } = init();
  const gltf = await l.loadAsync(url);
  const model = gltf.scene;

  const scene = new THREE.Scene();
  scene.environment = env;
  scene.add(model);
  model.updateMatrixWorld(true);

  try {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.001);
    const corners = [0, 1, 2, 3, 4, 5, 6, 7].map(
      (i) => new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)
    );

    const cam = new THREE.PerspectiveCamera(35, 1, radius / 100, radius * 100);
    const probeDist = radius / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2));

    // 1) En iyi açı: aynı mesafeden küçük çözünürlükte tara, silüeti en büyük olanı seç.
    r.setSize(PROBE_SIZE, PROBE_SIZE, false);
    r.setClearColor(0x000000, 0);
    let best = { az: PREFERRED_AZIMUTH, el: 0.4, score: -1 };
    for (let k = 0; k < 8; k++) {
      const az = (k * Math.PI) / 4;
      for (const el of [0.2, 0.4, 0.6]) {
        placeCamera(cam, center, az, el, probeDist);
        r.render(scene, cam);
        const score = coverage(r) * (1 + 0.08 * Math.cos(az - PREFERRED_AZIMUTH));
        if (score > best.score) best = { az, el, score };
      }
    }

    // 2) Ön görünüm: seçilen açı. Arka görünüm: aynı yükseklikte 180° karşısı.
    r.setSize(OUTPUT_SIZE, OUTPUT_SIZE, false);
    r.setClearColor(BACKGROUND, 1);
    return [best.az, best.az + Math.PI].map((az) => {
      const dist = fitDistance(cam, center, corners, az, best.el, probeDist);
      placeCamera(cam, center, az, best.el, dist);
      r.render(scene, cam);
      return r.domElement.toDataURL('image/jpeg', 0.9);
    });
  } finally {
    scene.remove(model);
    disposeObject(model);
  }
}

// Modeller sırayla işlenir (tek WebGL context), sonuçlar bellekte önbelleğe alınır.
const cache = new Map<string, Promise<string[]>>();
let chain: Promise<unknown> = Promise.resolve();

export function getModelThumbnail(url: string): Promise<string[]> {
  const hit = cache.get(url);
  if (hit) return hit;
  const job = chain.then(() => renderThumbnail(url));
  chain = job.catch(() => undefined);
  cache.set(url, job);
  job.catch(() => cache.delete(url)); // hata olursa tekrar denenebilsin
  return job;
}