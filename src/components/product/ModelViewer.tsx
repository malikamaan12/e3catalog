"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, PresentationControls, useGLTF, Bounds, Center } from "@react-three/drei";
import { Suspense, useState } from "react";

function DemoStage() {
    return (
        <group>
            {/* Stage Platform */}
            <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
                <boxGeometry args={[3, 0.3, 2]} />
                <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.3} />
            </mesh>

            {/* Platform surface detail */}
            <mesh position={[0, 0.31, 0]}>
                <boxGeometry args={[2.9, 0.02, 1.9]} />
                <meshStandardMaterial color="#666" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Legs */}
            {[[-1.3, -0.35, -0.8], [1.3, -0.35, -0.8], [-1.3, -0.35, 0.8], [1.3, -0.35, 0.8]].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]} castShadow>
                    <cylinderGeometry args={[0.05, 0.05, 0.7, 12]} />
                    <meshStandardMaterial color="#999" metalness={0.9} roughness={0.1} />
                </mesh>
            ))}

            {/* Truss vertical pillars */}
            {[[-1.2, 1.5, -0.7], [1.2, 1.5, -0.7]].map((pos, i) => (
                <mesh key={`truss-${i}`} position={pos as [number, number, number]} castShadow>
                    <cylinderGeometry args={[0.04, 0.04, 2.7, 8]} />
                    <meshStandardMaterial color="#aaa" metalness={0.85} roughness={0.15} />
                </mesh>
            ))}

            {/* Cross beam */}
            <mesh position={[0, 2.85, -0.7]} castShadow>
                <boxGeometry args={[2.6, 0.08, 0.08]} />
                <meshStandardMaterial color="#aaa" metalness={0.85} roughness={0.15} />
            </mesh>

            {/* Lights on beam */}
            {[-0.8, 0, 0.8].map((x, i) => (
                <group key={`light-${i}`} position={[x, 2.7, -0.7]}>
                    <mesh>
                        <cylinderGeometry args={[0.08, 0.06, 0.15, 8]} />
                        <meshStandardMaterial color="#333" metalness={0.9} roughness={0.2} />
                    </mesh>
                    <pointLight position={[0, -0.2, 0]} intensity={0.3} color="#c9a84c" distance={3} />
                </group>
            ))}
        </group>
    );
}

function DynamicModel({ url }: { url: string }) {
    const { scene } = useGLTF(url, "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    // Wrap primitive in <Center bottom> to align the bounding box floor to y=0
    return (
        <Center bottom>
            <primitive object={scene} castShadow receiveShadow />
        </Center>
    );
}

// Preload common model or the requested one if possible
// useGLTF.preload(url) 


export default function ModelViewer({ url, posterUrl }: { url?: string; posterUrl?: string }) {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div className="h-96 rounded-xl overflow-hidden bg-[var(--color-navy-lighter)] relative group">
            {/* Poster Image Overlay — Shown until Canvas/Model is ready */}
            {!isLoaded && posterUrl && (
                <div className="absolute inset-0 z-10 transition-opacity duration-700">
                    <img
                        src={posterUrl}
                        alt="3D Model Poster"
                        className="w-full h-full object-cover blur-sm scale-105 opacity-40"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-navy)] bg-opacity-40 backdrop-blur-md">
                        <div className="w-10 h-10 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm font-medium text-[var(--color-warm-white)]">Initializing 3D Engine...</p>
                    </div>
                </div>
            )}

            <Canvas
                camera={{ position: [4, 3, 4], fov: 45 }}
                shadows
                style={{ background: "transparent" }}
                onCreated={() => setIsLoaded(true)}
            >
                <Suspense fallback={null}>
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[5, 8, 3]} intensity={0.8} castShadow />

                    <PresentationControls
                        global
                        zoom={0.8}
                        rotation={[0, -Math.PI / 4, 0]}
                        polar={[-Math.PI / 4, Math.PI / 4]}
                        azimuth={[-Math.PI / 4, Math.PI / 4]}
                    >
                        {url ? (
                            <Bounds fit clip observe margin={1.2}>
                                <DynamicModel url={url} />
                            </Bounds>
                        ) : (
                            <DemoStage />
                        )}
                    </PresentationControls>

                    <ContactShadows position={[0, -0.7, 0]} opacity={0.4} blur={2} far={4} />
                    <Environment preset="city" />
                </Suspense>
                <OrbitControls enablePan={false} enableZoom={true} maxPolarAngle={Math.PI / 2} />
            </Canvas>

            {/* Overlay instructions */}
            <div className="absolute bottom-4 left-4 text-xs text-[var(--color-slate)] bg-[var(--color-navy)] bg-opacity-80 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm group-hover:border-[var(--color-gold)]/30 transition-all">
                🖱️ Drag to rotate · Scroll to zoom
            </div>
        </div>
    );
}
