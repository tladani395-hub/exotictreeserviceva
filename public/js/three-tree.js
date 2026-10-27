/**
 * Exotic Tree Service VA — Interactive 3D Tree & Organic Canopy Engine
 * Uses Three.js with fallback canvas for buttery smooth 60fps performance on all devices.
 */

(function () {
  const canvas = document.getElementById('three-tree-canvas');
  if (!canvas) return;

  // Check if Three.js is loaded
  if (typeof THREE === 'undefined') {
    // Render high-performance 2D/3D Canvas fallback
    renderCanvasParticles(canvas);
    return;
  }

  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 28;
    camera.position.y = 2;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ambient & Point Lighting
    const ambientLight = new THREE.AmbientLight(0x10b981, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xf59e0b, 2.5, 50);
    sunLight.position.set(10, 15, 10);
    scene.add(sunLight);

    const greenFill = new THREE.PointLight(0x34d399, 1.8, 40);
    greenFill.position.set(-10, -5, 10);
    scene.add(greenFill);

    // Group for the entire 3D botanical canopy
    const treeGroup = new THREE.Group();
    scene.add(treeGroup);

    // 1. Procedural Trunk & Branch Nodes
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x2b1d0c,
      roughness: 0.9,
      metalness: 0.1
    });

    const trunkGeo = new THREE.CylinderGeometry(0.8, 1.6, 9, 8);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = -3.5;
    treeGroup.add(trunk);

    // 2. Canopy Foliage Particle Cloud (Leaves & Spores)
    const particleCount = window.innerWidth < 768 ? 600 : 1600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const emeraldColor = new THREE.Color(0x10b981);
    const amberColor = new THREE.Color(0xf59e0b);
    const limeColor = new THREE.Color(0x84cc16);

    for (let i = 0; i < particleCount; i++) {
      // Hemisphere distribution for full crown
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * 8.5;

      const sinPhi = Math.sin(phi);
      const x = r * sinPhi * Math.cos(theta);
      const y = r * sinPhi * Math.sin(theta) + 3.5;
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color variation between Emerald, Amber and Lime
      const mixedColor = emeraldColor.clone();
      if (Math.random() > 0.6) {
        mixedColor.lerp(amberColor, Math.random());
      } else if (Math.random() > 0.4) {
        mixedColor.lerp(limeColor, Math.random());
      }

      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom Particle Texture
    const particleMat = new THREE.PointsMaterial({
      size: window.innerWidth < 768 ? 0.4 : 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const leafParticles = new THREE.Points(geometry, particleMat);
    treeGroup.add(leafParticles);

    // 3. Floating Amber Spores
    const sporeCount = 120;
    const sporeGeo = new THREE.BufferGeometry();
    const sporePos = new Float32Array(sporeCount * 3);

    for (let i = 0; i < sporeCount * 3; i += 3) {
      sporePos[i] = (Math.random() - 0.5) * 35;
      sporePos[i + 1] = (Math.random() - 0.5) * 20;
      sporePos[i + 2] = (Math.random() - 0.5) * 25;
    }

    sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePos, 3));
    const sporeMat = new THREE.PointsMaterial({
      size: 0.25,
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const spores = new THREE.Points(sporeGeo, sporeMat);
    scene.add(spores);

    // Interactive Mouse Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Touch support for mobile devices
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        mouseX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
      }
    }, { passive: true });

    // Handle Window Resize
    window.addEventListener('resize', () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    // Animation Loop
    let clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Gentle organic breeze sway
      targetX += (mouseX * 0.4 - targetX) * 0.05;
      targetY += (mouseY * 0.2 - targetY) * 0.05;

      treeGroup.rotation.y = targetX * 0.5 + Math.sin(elapsedTime * 0.6) * 0.08;
      treeGroup.rotation.x = -targetY * 0.2 + Math.cos(elapsedTime * 0.4) * 0.04;
      treeGroup.position.y = Math.sin(elapsedTime * 0.8) * 0.2;

      // Rotate Spores
      spores.rotation.y = elapsedTime * 0.03;
      spores.rotation.x = Math.sin(elapsedTime * 0.05) * 0.1;

      renderer.render(scene, camera);
    }

    animate();

  } catch (err) {
    console.warn('WebGL init failed, using 2D fallback:', err);
    renderCanvasParticles(canvas);
  }

  // 2D Canvas Fallback
  function renderCanvasParticles(cvs) {
    const ctx = cvs.getContext('2d');
    let width = (cvs.width = cvs.clientWidth);
    let height = (cvs.height = cvs.clientHeight);

    const particles = [];
    const count = 75;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 3 + 1,
        color: Math.random() > 0.5 ? '#10b981' : '#f59e0b',
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.3,
        alpha: Math.random() * 0.6 + 0.2
      });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }
    draw();
  }
})();
