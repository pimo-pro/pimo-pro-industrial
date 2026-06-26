import { Canvas } from '@react-three/fiber';
import { Edges, OrbitControls } from '@react-three/drei';
import { useMemo, type ReactElement } from 'react';

import type { OrlaEdge, PieceHole, PieceOrla } from '@/types/piece';

const EDGE_COLORS: Record<OrlaEdge, string> = {
  TOP: '#38bdf8',
  BOTTOM: '#f472b6',
  LEFT: '#a78bfa',
  RIGHT: '#fbbf24',
};

function PanelMesh({
  width,
  height,
  thickness,
  holes,
  orla,
  selectedHoleId,
}: {
  width: number;
  height: number;
  thickness: number;
  holes: PieceHole[];
  orla: PieceOrla;
  selectedHoleId: string | null;
}) {
  const w = Math.max(width, 1) / 100;
  const h = Math.max(height, 1) / 100;
  const t = Math.max(thickness, 1) / 100;

  const holeMeshes = useMemo(() => {
    return holes.map((hole) => {
      const radius = Math.max(hole.diameter, 1) / 200;
      const depth = Math.max(hole.depth, 1) / 100;
      const x = (hole.x / width - 0.5) * w;
      const y = (0.5 - hole.y / height) * h;
      const selected = selectedHoleId === hole.id;
      return (
        <mesh key={hole.id} position={[x, y, t / 2 + 0.001]}>
          <cylinderGeometry args={[radius, radius, depth, 16]} />
          <meshStandardMaterial color={selected ? '#fbbf24' : '#64748b'} emissive={selected ? '#78350f' : '#000000'} />
        </mesh>
      );
    });
  }, [holes, selectedHoleId, w, h, t, width, height]);

  const edgeHighlights = useMemo(() => {
    if (!orla.hasOrla) return null;
    const strip = 0.015;
    const z = t / 2 + strip / 2;
    const items: ReactElement[] = [];
    if (orla.edges.includes('TOP')) {
      items.push(
        <mesh key="top" position={[0, h / 2, z]}>
          <boxGeometry args={[w, strip, strip]} />
          <meshStandardMaterial color={EDGE_COLORS.TOP} emissive={EDGE_COLORS.TOP} emissiveIntensity={0.35} />
        </mesh>
      );
    }
    if (orla.edges.includes('BOTTOM')) {
      items.push(
        <mesh key="bottom" position={[0, -h / 2, z]}>
          <boxGeometry args={[w, strip, strip]} />
          <meshStandardMaterial color={EDGE_COLORS.BOTTOM} emissive={EDGE_COLORS.BOTTOM} emissiveIntensity={0.35} />
        </mesh>
      );
    }
    if (orla.edges.includes('LEFT')) {
      items.push(
        <mesh key="left" position={[-w / 2, 0, z]}>
          <boxGeometry args={[strip, h, strip]} />
          <meshStandardMaterial color={EDGE_COLORS.LEFT} emissive={EDGE_COLORS.LEFT} emissiveIntensity={0.35} />
        </mesh>
      );
    }
    if (orla.edges.includes('RIGHT')) {
      items.push(
        <mesh key="right" position={[w / 2, 0, z]}>
          <boxGeometry args={[strip, h, strip]} />
          <meshStandardMaterial color={EDGE_COLORS.RIGHT} emissive={EDGE_COLORS.RIGHT} emissiveIntensity={0.35} />
        </mesh>
      );
    }
    return items;
  }, [orla, w, h, t]);

  return (
    <group rotation={[0.2, 0.4, 0]}>
      <mesh>
        <boxGeometry args={[w, h, t]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.05} roughness={0.75} />
        <Edges color="#475569" />
      </mesh>
      {edgeHighlights}
      {holeMeshes}
    </group>
  );
}

export function PieceViewer3D({
  width,
  height,
  thickness,
  holes,
  orla,
  selectedHoleId,
}: {
  width: number;
  height: number;
  thickness: number;
  holes: PieceHole[];
  orla: PieceOrla;
  selectedHoleId: string | null;
}) {
  return (
    <div className="panel">
      <h2>Viewer 3D — peça única</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 0 }}>
        Rotação · zoom · pan. Orla destacada nas arestas. Furo selecionado a amarelo.
      </p>
      <div className="viewer-canvas">
        <Canvas camera={{ position: [2.5, 2, 3], fov: 45 }}>
          <ambientLight intensity={0.65} />
          <directionalLight position={[4, 6, 3]} intensity={0.9} />
          <PanelMesh
            width={width}
            height={height}
            thickness={thickness}
            holes={holes}
            orla={orla}
            selectedHoleId={selectedHoleId}
          />
          <OrbitControls enablePan enableZoom enableRotate />
        </Canvas>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12, fontSize: 13 }}>
        <div>
          <strong>Largura</strong>
          <div>{width} mm</div>
        </div>
        <div>
          <strong>Altura</strong>
          <div>{height} mm</div>
        </div>
        <div>
          <strong>Espessura</strong>
          <div>{thickness} mm</div>
        </div>
      </div>
    </div>
  );
}
