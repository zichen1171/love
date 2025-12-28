import * as THREE from 'three';

function createCircleTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.5);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
}

function initSolarSystem(stage) {
    if (!stage || !stage.scene || !stage.registerTick) {
        console.warn('solar-system: cosmic stage api unavailable');
        return;
    }
    const {scene, registerTick, THREE} = stage;
    const circleTexture = createCircleTexture();

    const orbitTemplate = [
        {distance: 96, size: 4.2, speed: 0.65, color: 0xaecbfa},
        {distance: 138, size: 4.8, speed: 0.45, color: 0xd7aaff},
        {distance: 189, size: 5.4, speed: 0.32, color: 0x9ef7d2},
        {distance: 246, size: 6.6, speed: 0.25, color: 0xffd284},
        {distance: 324, size: 4.5, speed: 0.18, color: 0x8ed1ff},
        {distance: 408, size: 3.6, speed: 0.14, color: 0x9c82ff}
    ];

    const clusters = [];
    const clusterCount = 128;
    const minSpacing = 540;
    const bounds = 4800;
    const maxAttempts = 6000;

    function generateClusterPosition() {
        let attempts = 0;
        while (attempts < maxAttempts) {
            attempts += 1;
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * bounds,
                (Math.random() - 0.5) * bounds * 0.35,
                (Math.random() - 0.5) * bounds
            );
            const tooClose = clusters.some((cluster) => cluster.position.distanceTo(position) < minSpacing);
            if (!tooClose) {
                return position;
            }
        }
        return new THREE.Vector3(
            (Math.random() - 0.5) * bounds,
            (Math.random() - 0.5) * bounds * 0.35,
            (Math.random() - 0.5) * bounds
        );
    }

    function createSolarCluster(index) {
        const solarGroup = new THREE.Group();
        solarGroup.position.copy(generateClusterPosition());
        solarGroup.rotation.y = Math.random() * Math.PI * 2;
        scene.add(solarGroup);

        const sunParticleCount = 5200;
        const sunPositions = new Float32Array(sunParticleCount * 3);
        const sunColors = new Float32Array(sunParticleCount * 3);
        for (let i = 0; i < sunParticleCount; i++) {
            const radius = Math.random() * 90;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            sunPositions[i * 3] = x;
            sunPositions[i * 3 + 1] = y;
            sunPositions[i * 3 + 2] = z;
            const color = new THREE.Color().setHSL(0.08 + Math.random() * 0.03, 0.85, 0.55 + Math.random() * 0.1);
            sunColors[i * 3] = color.r;
            sunColors[i * 3 + 1] = color.g;
            sunColors[i * 3 + 2] = color.b;
        }
        const sunGeometry = new THREE.BufferGeometry();
        sunGeometry.setAttribute('position', new THREE.BufferAttribute(sunPositions, 3));
        sunGeometry.setAttribute('color', new THREE.BufferAttribute(sunColors, 3));
        const sunMaterial = new THREE.PointsMaterial({
            size: 14,
            map: circleTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const sunPoints = new THREE.Points(sunGeometry, sunMaterial);
        solarGroup.add(sunPoints);

        const orbitGroups = [];
        const orbitSegments = 2000;
        orbitTemplate.forEach((template) => {
            const config = {
                ...template,
                speed: template.speed * (0.9 + Math.random() * 0.2),
                size: template.size * (0.8 + Math.random() * 0.4),
                distance: template.distance * (0.95 + Math.random() * 0.2)
            };
            const pivot = new THREE.Group();
            const axis = new THREE.Vector3(
                THREE.MathUtils.randFloat(-1, 1),
                THREE.MathUtils.randFloat(-1, 1),
                THREE.MathUtils.randFloat(-1, 1)
            ).normalize();
            const tiltAngle = THREE.MathUtils.degToRad(5 + Math.random() * 55);
            pivot.quaternion.setFromAxisAngle(axis, tiltAngle);
            const wobble = THREE.MathUtils.degToRad(2 + Math.random() * 6);
            solarGroup.add(pivot);

            const orbitPositions = new Float32Array(orbitSegments * 3);
            for (let i = 0; i < orbitSegments; i++) {
                const angle = (i / orbitSegments) * Math.PI * 2;
                orbitPositions[i * 3] = Math.cos(angle) * config.distance;
                orbitPositions[i * 3 + 1] = 0;
                orbitPositions[i * 3 + 2] = Math.sin(angle) * config.distance;
            }
            const orbitGeometry = new THREE.BufferGeometry();
            orbitGeometry.setAttribute('position', new THREE.BufferAttribute(orbitPositions, 3));
            const orbitMaterial = new THREE.PointsMaterial({
                size: 3,
                map: circleTexture,
                color: config.color,
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const orbitPoints = new THREE.Points(orbitGeometry, orbitMaterial);
            pivot.add(orbitPoints);

            const planetGeometry = new THREE.BufferGeometry();
            planetGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([config.distance, 0, 0]), 3));
            const planetMaterial = new THREE.PointsMaterial({
                size: Math.max(7, config.size * 4.2),
                map: circleTexture,
                color: config.color,
                transparent: true,
                opacity: 1,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const planetPoint = new THREE.Points(planetGeometry, planetMaterial);
            pivot.add(planetPoint);

            const spriteMaterial = new THREE.SpriteMaterial({
                map: circleTexture,
                color: config.color,
                transparent: true,
                opacity: 0.95,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            const spriteSize = Math.max(28, config.size * 18);
            sprite.scale.set(spriteSize, spriteSize, 1);
            pivot.add(sprite);

            orbitGroups.push({
                pivot,
                planetPoint,
                sprite,
                config,
                wobble
            });
        });

        registerTick(({elapsed, delta}) => {
            sunPoints.rotation.y += delta * 0.25;
            orbitGroups.forEach(({planetPoint, sprite, config, wobble, pivot}) => {
                pivot.rotation.z += Math.sin(elapsed * 0.15 + config.speed) * wobble * 0.001;
                const angle = elapsed * config.speed;
                const x = Math.cos(angle) * config.distance;
                const z = Math.sin(angle) * config.distance;
                const attr = planetPoint.geometry.attributes.position;
                attr.setXYZ(0, x, 0, z);
                attr.needsUpdate = true;
                sprite.position.set(x, 0, z);
                sprite.material.opacity = 0.7 + Math.sin(elapsed * 0.6 + config.speed) * 0.25;
            });
        });

        clusters.push({position: solarGroup.position.clone(), group: solarGroup});
    }

    let created = 0;
    while (created < clusterCount && created < maxAttempts) {
        createSolarCluster(created);
        created += 1;
    }
}

if (window.cosmicStage) {
    initSolarSystem(window.cosmicStage);
} else {
    window.addEventListener('cosmic-stage-ready', (event) => {
        initSolarSystem(event.detail);
    });
}
