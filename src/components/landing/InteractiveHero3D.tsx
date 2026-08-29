"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function InteractiveHero3D() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // 1. Scene & Camera setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            55,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.z = 7;

        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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

        // Surrounding Particle Constellation (Floating event hardware nodes)
        const particleCount = 280;
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

        window.addEventListener("mousemove", handleMouseMove, { passive: true });

        // 4. Resize Handler
        const handleResize = () => {
            if (!canvas) return;
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        };

        window.addEventListener("resize", handleResize);

        // 5. Animation Loop
        let animationFrameId: number;
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const delta = clock.getDelta();

            // Smooth mouse interpolation
            currentRotX += (targetRotX - currentRotX) * (delta * 3.5);
            currentRotY += (targetRotY - currentRotY) * (delta * 3.5);

            // Autonomous orbital spin
            sphereGroup.rotation.y += delta * 0.15 + (currentRotY * 0.02);
            sphereGroup.rotation.x = currentRotX;
            sphereGroup.rotation.z += delta * 0.05;

            // Counter rotation for inner core
            meshInner.rotation.y -= delta * 0.25;
            meshInner.rotation.x += delta * 0.1;

            renderer.render(scene, camera);
        };

        animate();

        // 6. Cleanup
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("resize", handleResize);
            renderer.dispose();
            geoMain.dispose();
            matWire.dispose();
            geoInner.dispose();
            matInner.dispose();
            particleGeometry.dispose();
            particleMaterial.dispose();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full object-cover scale-110 md:scale-105 pointer-events-none"
        />
    );
}
