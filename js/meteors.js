import * as THREE from 'three';

function createMeteorTexture() {
    const size = 128;
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

function initMeteors(stage) {
    if (!stage || !stage.scene || !stage.THREE) {
        console.warn('meteors: cosmic stage api unavailable');
        return;
    }
    const {scene, registerTick} = stage;
    const meteorTexture = createMeteorTexture();
    const meteorGroup = new THREE.Group();
    scene.add(meteorGroup);

    const meteorCount = 120;
    const meteorData = [];
    const spawnBounds = 520;
    const despawnY = -120;
    const baseUp = new THREE.Vector3(0, 1, 0);
    const altUp = new THREE.Vector3(1, 0, 0);
    const tmpDir = new THREE.Vector3();
    const tmpUp = new THREE.Vector3();
    const tmpSide = new THREE.Vector3();
    const tmpTailVec = new THREE.Vector3();
    const tmpTailEnd = new THREE.Vector3();
    const tmpHeadLeft = new THREE.Vector3();
    const tmpHeadRight = new THREE.Vector3();
    const tmpTailLeft = new THREE.Vector3();
    const tmpTailRight = new THREE.Vector3();

    function randomColor() {
        const hues = [0.02, 0.07, 0.12, 0.58, 0.65];
        const hueBase = hues[Math.floor(Math.random() * hues.length)];
        const hue = (hueBase + Math.random() * 0.05) % 1;
        const saturation = 0.45 + Math.random() * 0.45;
        const lightness = 0.5 + Math.random() * 0.35;
        return new THREE.Color().setHSL(hue, saturation, lightness);
    }

    function randomDirection() {
        const dir = new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(2),
            -0.4 - Math.random() * 1.6,
            THREE.MathUtils.randFloatSpread(2)
        );
        return dir.normalize();
    }

    function randomStartPosition() {
        return new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(spawnBounds * 1.4),
            160 + Math.random() * 160,
            THREE.MathUtils.randFloatSpread(spawnBounds * 1.4)
        );
    }

    function updateTailGeometry(meteor, fadeFactor) {
        tmpDir.copy(meteor.velocity);
        if (tmpDir.lengthSq() === 0) {
            tmpDir.set(0, -1, 0);
        }
        tmpDir.normalize();
        tmpUp.copy(Math.abs(tmpDir.dot(baseUp)) > 0.95 ? altUp : baseUp);
        tmpSide.crossVectors(tmpDir, tmpUp).normalize();
        const headWidth = meteor.tailWidth;
        const tailWidth = Math.max(0.05, headWidth * 0.15 * fadeFactor);
        const tailScale = Math.max(0.15, fadeFactor) * meteor.tailLength * 0.02;
        tmpTailVec.copy(tmpDir).multiplyScalar(tailScale);
        tmpTailEnd.copy(meteor.position).sub(tmpTailVec);
        tmpHeadLeft.copy(meteor.position).addScaledVector(tmpSide, headWidth);
        tmpHeadRight.copy(meteor.position).addScaledVector(tmpSide, -headWidth);
        tmpTailLeft.copy(tmpTailEnd).addScaledVector(tmpSide, tailWidth);
        tmpTailRight.copy(tmpTailEnd).addScaledVector(tmpSide, -tailWidth);
        const attr = meteor.tail.geometry.getAttribute('position');
        attr.setXYZ(0, tmpHeadLeft.x, tmpHeadLeft.y, tmpHeadLeft.z);
        attr.setXYZ(1, tmpHeadRight.x, tmpHeadRight.y, tmpHeadRight.z);
        attr.setXYZ(2, tmpTailLeft.x, tmpTailLeft.y, tmpTailLeft.z);
        attr.setXYZ(3, tmpTailRight.x, tmpTailRight.y, tmpTailRight.z);
        attr.needsUpdate = true;
    }

    function spawnMeteor(data) {
        data.position.copy(randomStartPosition());
        data.velocity.copy(randomDirection()).multiplyScalar(67.5 + Math.random() * 165);
        data.lifetime = 0;
        data.maxLifetime = 2.4 + Math.random() * 2.8;
        data.tailLength = (45 + Math.random() * 140) * 2.4;
        data.tailWidth = (0.8 + Math.random() * 1.6) * (data.tailLength * 0.01);
        data.color.copy(randomColor());
        const spriteScale = (3 + Math.random() * 5) * 1.5;
        data.sprite.scale.set(spriteScale, spriteScale, 1);
        data.sprite.material.color.copy(data.color);
        data.spriteBaseOpacity = 0.65 + Math.random() * 0.25;
        data.sprite.material.opacity = data.spriteBaseOpacity;
        data.sprite.position.copy(data.position);
        data.tailBaseOpacity = 0.5 + Math.random() * 0.35;
        data.tail.material.color.copy(data.color);
        data.tail.material.opacity = data.tailBaseOpacity;
        updateTailGeometry(data, 1);
    }

    for (let i = 0; i < meteorCount; i++) {
        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: meteorTexture,
                color: 0xffffff,
                transparent: true,
                opacity: 0.85,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            })
        );
        meteorGroup.add(sprite);
        const tailGeometry = new THREE.BufferGeometry();
        tailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
        tailGeometry.setIndex([0, 2, 1, 2, 3, 1]);
        const tailMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.frustumCulled = false;
        meteorGroup.add(tail);
        const data = {
            sprite,
            tail,
            position: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            lifetime: 0,
            maxLifetime: 4,
            tailLength: 30,
            color: new THREE.Color(),
            tailWidth: 1,
            spriteBaseOpacity: 0.8,
            tailBaseOpacity: 0.8
        };
        spawnMeteor(data);
        meteorData.push(data);
    }

    registerTick(({delta}) => {
        meteorData.forEach((meteor) => {
            meteor.lifetime += delta;
            meteor.position.addScaledVector(meteor.velocity, delta);
            meteor.sprite.position.copy(meteor.position);
            const fadeFactor = Math.max(0, 1 - meteor.lifetime / meteor.maxLifetime);
            updateTailGeometry(meteor, fadeFactor);
            meteor.sprite.material.opacity = THREE.MathUtils.clamp(
                (0.35 + fadeFactor * 0.5) * meteor.spriteBaseOpacity,
                0,
                1
            );
            meteor.tail.material.opacity = THREE.MathUtils.clamp(
                (0.2 + fadeFactor * 0.5) * meteor.tailBaseOpacity,
                0,
                1
            );
            if (
                meteor.lifetime >= meteor.maxLifetime ||
                meteor.position.y < despawnY ||
                meteor.position.length() > spawnBounds * 2.2
            ) {
                spawnMeteor(meteor);
            }
        });
    });
}

if (window.cosmicStage) {
    initMeteors(window.cosmicStage);
} else {
    window.addEventListener('cosmic-stage-ready', (event) => initMeteors(event.detail));
}
