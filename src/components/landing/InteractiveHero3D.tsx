"use client";

import React, { useEffect, useRef, useState, Component, ErrorInfo, ReactNode } from "react";
import * as THREE from "three";

/**
 * WebGL Capability Detection
 * Safe in SSR and headless/VM environments
 */
function isWebGLAvailable(): boolean {
    if (typeof window === "undefined") return false;
    try {
        const canvas = document.createElement("canvas");
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
    } catch {
        return false;
    }
}

/**
 * Fallback 2D Animated Constellation Hero
 * Rendered when WebGL is unsupported, disabled, or throws an error.
 */
function StaticHeroFallback() {
    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden pointer-events-none">
            {/* Ambient Radial Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(201,168,76,0.18),transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(229,199,107,0.08),transparent_50%)]" />

            {/* Geometric Concentric Rings */}
            <div className="relative w-[340px] h-[340px] md:w-[500px] md:h-[500px] rounded-full border border-[var(--color-gold)]/20 animate-[spin_60s_linear_infinite] flex items-center justify-center">
                <div className="w-[260px] h-[260px] md:w-[380px] md:h-[380px] rounded-full border border-[var(--color-gold)]/15 border-dashed animate-[spin_40s_linear_infinite_reverse] flex items-center justify-center">
                    <div className="w-[180px] h-[180px] md:w-[260px] md:h-[260px] rounded-full border border-[var(--color-gold)]/25 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--color-gold)]/10 blur-md animate-pulse" />
                    </div>
                </div>

                {/* Satellite Constellation Nodes */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--color-gold)] shadow-[0_0_12px_#c9a84c]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-[var(--color-gold)] shadow-[0_0_12px_#c9a84c]" />
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--color-gold)] shadow-[0_0_12px_#c9a84c]" />
                <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--color-gold)] shadow-[0_0_12px_#c9a84c]" />
            </div>
        </div>
    );
}

/**
 * Three.js WebGL Scene Implementation
 */
function ThreeScene() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [renderError, setRenderError] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        let renderer: THREE.WebGLRenderer | null = null;
        let animationFrameId: number;
        let cleanupResources: (() => void) | null = null;

        try {
            // 1. Scene & Camera setup
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(
                55,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );
            camera.position.z = 7;

            renderer = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                antialias: true,
                powerPreference: "high-performance",
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

            // 2. Interactive Gold Icosahedron Structure
            const sphereGroup = new THREE.Group();
            scene.add(sphereGroup);

            // Core Wireframe Polyhedron
            const geoMain = new THREE.IcosahedronGeometry(2.4, 2);
            const matWire = new THREE.MeshBasicMaterial({
                color: 0xc9a84c, // E3 Gold
                wireframe: true,
                transparent: true,
                opacity: 0.22,
            });
            const meshMain = new THREE.Mesh(geoMain, matWire);
            sphereGroup.add(meshMain);

            // Inner Core Mesh
            const geoInner = new THREE.IcosahedronGeometry(1.6, 1);
            const matInner = new THREE.MeshBasicMaterial({
                color: 0xe5c76b,
                wireframe: true,
                transparent: true,
                opacity: 0.35,
            });
            const meshInner = new THREE.Mesh(geoInner, matInner);
            sphereGroup.add(meshInner);

            // Surrounding Particle Constellation
            const particleCount = 240;
            const particleGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const scales = new Float32Array(particleCount);

            for (let i = 0; i < particleCount * 3; i += 3) {
                const u = Math.random();
                const v = Math.random();
                const theta = u * 2.0 * Math.PI;
                const phi = Math.acos(2.0 * v - 1.0);
                const r = 2.8 + Math.random() * 2.2;

                positions[i] = r * Math.sin(phi) * Math.cos(theta);
                positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
                positions[i + 2] = r * Math.cos(phi);
                scales[i / 3] = Math.random() * 0.5 + 0.5;
            }

            particleGeometry.setAttribute(
                "position",
                new THREE.BufferAttribute(positions, 3)
            );

            const particleMaterial = new THREE.PointsMaterial({
                color: 0xf5d77f,
                size: 0.045,
                transparent: true,
                opacity: 0.75,
                blending: THREE.AdditiveBlending,
            });

            const particlePoints = new THREE.Points(particleGeometry, particleMaterial);
            sphereGroup.add(particlePoints);

            // 3. Mouse Parallax Tracking
            let targetRotX = 0;
            let targetRotY = 0;
            let currentRotX = 0;
            let currentRotY = 0;

            const handleMouseMove = (e: MouseEvent) => {
                const x = (e.clientX / window.innerWidth) * 2 - 1;
                const y = -(e.clientY / window.innerHeight) * 2 + 1;
                targetRotY = x * 0.45;
                targetRotX = -y * 0.35;
            };

            if (!prefersReducedMotion) {
                window.addEventListener("mousemove", handleMouseMove, { passive: true });
            }

            // 4. Resize Handler
            const handleResize = () => {
                if (!canvas || !renderer) return;
                const width = window.innerWidth;
                const height = window.innerHeight;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            };

            window.addEventListener("resize", handleResize);

            // 5. Animation Loop
            const clock = new THREE.Clock();

            const animate = () => {
                animationFrameId = requestAnimationFrame(animate);
                const delta = clock.getDelta();

                if (!prefersReducedMotion) {
                    currentRotX += (targetRotX - currentRotX) * (delta * 3.5);
                    currentRotY += (targetRotY - currentRotY) * (delta * 3.5);

                    sphereGroup.rotation.y += delta * 0.15 + (currentRotY * 0.02);
                    sphereGroup.rotation.x = currentRotX;
                    sphereGroup.rotation.z += delta * 0.05;

                    meshInner.rotation.y -= delta * 0.25;
                    meshInner.rotation.x += delta * 0.1;
                }

                if (renderer) {
                    renderer.render(scene, camera);
                }
            };

            animate();

            cleanupResources = () => {
                cancelAnimationFrame(animationFrameId);
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("resize", handleResize);
                if (renderer) {
                    renderer.dispose();
                }
                geoMain.dispose();
                matWire.dispose();
                geoInner.dispose();
                matInner.dispose();
                particleGeometry.dispose();
                particleMaterial.dispose();
            };
        } catch (err) {
            console.warn("WebGL initialization failed, falling back to 2D hero:", err);
            setRenderError(true);
        }

        return () => {
            if (cleanupResources) {
                cleanupResources();
            }
        };
    }, []);

    if (renderError) {
        return <StaticHeroFallback />;
    }

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full object-cover scale-110 md:scale-105 pointer-events-none"
        />
    );
}

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

class HeroErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.warn("HeroErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

/**
 * Public Exported Component with Guarded WebGL Detection and Fallback
 */
export default function InteractiveHero3D() {
    const [isSupported, setIsSupported] = useState<boolean | null>(null);

    useEffect(() => {
        setIsSupported(isWebGLAvailable());
    }, []);

    if (isSupported === false) {
        return <StaticHeroFallback />;
    }

    if (isSupported === null) {
        // While hydrating / detecting, render the fallback cleanly
        return <StaticHeroFallback />;
    }

    return (
        <HeroErrorBoundary fallback={<StaticHeroFallback />}>
            <ThreeScene />
        </HeroErrorBoundary>
    );
}
