import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RotateCcw, Grid3x3, Play, Pause, Sun, Moon, Box, AlertCircle } from 'lucide-react';
import { useContentProtection } from '@/hooks/useContentProtection';
import { Watermark } from '@/components/Watermark';

interface Viewer3DProps {
  modelUrl: string;
  watermarkText: string;
}

type ToolButtonProps = {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
};

function ToolButton({ active, onClick, title, children }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-all ${
        active
          ? 'bg-slate-800 text-white border-slate-700 shadow-md'
          : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

export function Viewer3D({ modelUrl, watermarkText }: Viewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const animRef = useRef<number>(0);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const ambientRef = useRef<THREE.AmbientLight | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const { blurred } = useContentProtection(true, watermarkText);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? 0x0f172a : 0xf1f5f9);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4, 3, 6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    ambientRef.current = ambient;

    const directional = new THREE.DirectionalLight(0xffffff, 1.2);
    directional.position.set(5, 8, 5);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 30;
    directional.shadow.camera.left = -10;
    directional.shadow.camera.right = 10;
    directional.shadow.camera.top = 10;
    directional.shadow.camera.bottom = -10;
    scene.add(directional);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(20, 40, 0x475569, 0x334155);
    (grid.material as THREE.Material).opacity = 0.3;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -1.5;
    scene.add(grid);
    gridRef.current = grid;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;

    const groundGeo = new THREE.CircleGeometry(10, 64);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.2 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    ground.receiveShadow = true;
    scene.add(ground);

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        const scale = 3 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y -= 1.5 - (size.y * scale) / 2;

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);
        modelRef.current = model;
        setLoading(false);
      },
      undefined,
      (err: unknown) => {
        console.error('Model load error:', err);
        const fallbackGeo = new THREE.BoxGeometry(2, 2, 2);
        const fallbackMat = new THREE.MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.5,
          metalness: 0.2,
        });
        const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
        fallback.castShadow = true;
        fallback.position.y = 0;
        scene.add(fallback);
        modelRef.current = fallback as unknown as THREE.Group;
        setLoading(false);
        const reason = err instanceof Error ? err.message : String(err);
        setError(`3D model yüklenemedi (${reason}). URL: ${modelUrl}`);
      }
    );

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 2;
        controlsRef.current.update();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animRef.current);
      controls.dispose();
      draco.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(darkMode ? 0x0f172a : 0xf1f5f9);
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = darkMode ? 0.5 : 0.7;
    }
    if (gridRef.current) {
      const colors = darkMode ? [0x475569, 0x334155] : [0xcbd5e1, 0xe2e8f0];
      const grid = gridRef.current;
      const geo = grid.geometry as THREE.BufferGeometry;
      const positions = geo.attributes.position;
      const colorAttr = new Float32Array(positions.count * 3);
      const c1 = new THREE.Color(colors[0]);
      const c2 = new THREE.Color(colors[1]);
      for (let i = 0; i < positions.count; i++) {
        const isCenter = positions.getY(i) !== 0;
        const c = isCenter ? c1 : c2;
        colorAttr[i * 3] = c.r;
        colorAttr[i * 3 + 1] = c.g;
        colorAttr[i * 3 + 2] = c.b;
      }
    }
  }, [darkMode]);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid;
    }
  }, [showGrid]);

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.wireframe = wireframe;
        }
      });
    }
  }, [wireframe]);

  const resetView = () => {
    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.reset();
      cameraRef.current.position.set(4, 3, 6);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
      <div
        ref={containerRef}
        className={`absolute inset-0 transition-all duration-300 ${blurred ? 'blur-2xl brightness-0' : ''}`}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-slate-600 border-t-white rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">3D model yükleniyor...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-4 right-16 z-30 flex items-start gap-2 rounded-lg bg-amber-500/95 px-3 py-2 text-white text-xs break-all select-text">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Watermark text={watermarkText} />

      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <ToolButton title="Görünümü sıfırla" onClick={resetView}>
          <RotateCcw className="w-4 h-4" />
        </ToolButton>
        <ToolButton title={wireframe ? 'Dolu modu' : 'Tel kafes modu'} active={wireframe} onClick={() => setWireframe(w => !w)}>
          <Grid3x3 className="w-4 h-4" />
        </ToolButton>
        <ToolButton title={autoRotate ? 'Otomatik döndürmeyi durdur' : 'Otomatik döndür'} active={autoRotate} onClick={() => setAutoRotate(r => !r)}>
          {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </ToolButton>
        <ToolButton title={showGrid ? 'Zemini gizle' : 'Zemini göster'} active={showGrid} onClick={() => setShowGrid(g => !g)}>
          <Box className="w-4 h-4" />
        </ToolButton>
        <ToolButton title={darkMode ? 'Açık tema' : 'Koyu tema'} active={darkMode} onClick={() => setDarkMode(d => !d)}>
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </ToolButton>
      </div>

      <div className="absolute bottom-4 left-4 z-20 rounded-lg bg-black/60 px-3 py-2 text-white/80 text-xs backdrop-blur-sm">
        Sol tık: döndür · Tekerlek: yakınlaştır · Sağ tık: kaydır
      </div>
    </div>
  );
}