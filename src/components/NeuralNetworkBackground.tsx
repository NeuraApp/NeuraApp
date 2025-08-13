import React, { useEffect, useRef } from 'react';

// Declaração para informar ao TypeScript sobre a existência do THREE no escopo global
declare const THREE: any;

const NeuralNetworkBackground = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof THREE === 'undefined') {
      console.error("Three.js library not found. Make sure it's included in your index.html");
      return;
    }

    const currentMount = mountRef.current;
    if (!currentMount) return;

    // --- Configuração da Cena ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);
    camera.position.z = 200;

    // --- Criação dos Neurónios (Partículas) ---
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 5000;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 500; // Distribuição aleatória
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.5,
      color: 0x8A2BE2, // Roxo azulado
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // --- Criação das Sinapses (Linhas) ---
    const linesGeometry = new THREE.BufferGeometry();
    const positions = particlesGeometry.attributes.position.array;
    const linesMaterial = new THREE.LineBasicMaterial({
      color: 0x483D8B, // Azul escuro
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
    });

    const connections = [];
    for (let i = 0; i < particlesCount; i++) {
      for (let j = i + 1; j < particlesCount; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < 25) { // Distância para criar uma conexão
          connections.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
          connections.push(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
        }
      }
    }
    linesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(connections, 3));
    const linesMesh = new THREE.LineSegments(linesGeometry, linesMaterial);
    scene.add(linesMesh);

    // --- Animação ---
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    document.addEventListener('mousemove', onMouseMove);

    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotação sutil e interação com o mouse
      particlesMesh.rotation.y = elapsedTime * 0.05 + mouseX * 0.2;
      particlesMesh.rotation.x = elapsedTime * 0.05 + mouseY * 0.2;
      linesMesh.rotation.y = elapsedTime * 0.05 + mouseX * 0.2;
      linesMesh.rotation.x = elapsedTime * 0.05 + mouseY * 0.2;
      
      renderer.render(scene, camera);
    };
    animate();

    // --- Responsividade ---
    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- Limpeza ---
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', onMouseMove);
      currentMount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />;
};

export default NeuralNetworkBackground;