
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import Stats from 'three/examples/jsm/libs/stats.module'
import { Character } from './character.js';
import { MapLevel } from './map.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js';


import CannonDebugger from 'cannon-es-debugger'
let physicsWorld
let scene, renderer, camera, stats, controls, composer
let character, clock, maplevel, mixerUpdateDelta
const margin = 0.05;
let isPersoncamera = true
let settings;

// tham số để thể hiện tưng hành động theo  các bước (gióng slow motion)
let singleStepMode = false;
let sizeOfNextStep = 0;

let cannonDebugger
init();
function init() {
    initGraphis()

    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({
        mass: 0, collisionFilterGroup: GROUP4,
        collisionFilterMask: GROUP4,
        collisionFilterMask: GROUP1 | GROUP2 | GROUP3
    });
    groundBody.addShape(groundShape);
    physicsWorld.addBody(groundBody);

    // Đặt vị trí của mặt đất
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Đặt mặt đất nằm ngang
    groundBody.position.set(0, -50, 0);


    // create model
    character = new Character(scene, camera, physicsWorld, new THREE.Vector3(0, 0, 0), 'Idle', 0.2)

    // crate map
    maplevel = new MapLevel(scene, physicsWorld, character)
    character.initModel().then(() => {
        maplevel.initMap(18).then(() => {
            var position_player = maplevel.position_player
            character.setPosition(new THREE.Vector3(position_player.x, 0, position_player.y))
            // character.updateCameraTarget()

            maplevel.setCharacter(character)
            createPanel()
        }
        )
    })


    cannonDebugger = new CannonDebugger(scene, physicsWorld, {
        // options...
    })
    animate();
}

function initGraphis() {
    scene = new THREE.Scene();
    const loadTexture = new THREE.TextureLoader();
    const texturebackground = loadTexture.load('publish/image/360_F_232925587_st4gM8b3TJHtjjddCIUNyVyFJmZqMmn4.jpg')
    scene.background = texturebackground

    //init camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000)
    camera.position.set(1, 2, - 3)
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();

    //init renderer
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg'),

        alpha: true,
        precision: 'highp',
        colorManagement: true
    })

    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.render(scene, camera)
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    composer = new EffectComposer(renderer);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0, 582
    bloomPass.strength = 0.7
    bloomPass.radius = 0
    composer.addPass(bloomPass);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    const renderPixelatedPass = new RenderPixelatedPass(1, scene, camera)
    renderPixelatedPass.normalEdgeStrength = 0
    renderPixelatedPass.depthEdgeStrength = 0
    composer.addPass(renderPixelatedPass)
    const glitchPass = new GlitchPass();
    composer.addPass(glitchPass);
    const luminosityPass = new ShaderPass(LuminosityShader);
    composer.addPass(luminosityPass);

    // init controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Add the axis helper to the scene
    const axisHelper = new THREE.AxesHelper(10);
    scene.add(axisHelper);

    //init stats
    stats = Stats()
    document.body.appendChild(stats.dom)
    // create Directional light
    const dirLight = new THREE.PointLight(0xffffff, 25000);
    dirLight.position.set(20, 100, 60);
    dirLight.castShadow = true;
    scene.add(dirLight);
    // Lấy thời gian
    clock = new THREE.Clock();
    // thiết lập thế giới vật lý 
    physicsWorld = new CANNON.World();
    physicsWorld.gravity.set(0, -9.8, 0); // Thiết lập trọng lực
    physicsWorld.broadphase = new CANNON.NaiveBroadphase();

    physicsWorld.defaultContactMaterial.contactEquationStiffness = 1e7;
    physicsWorld.defaultContactMaterial.contactEquationRelaxation = 5;
}




//
// tạo bảng điều khuyển
function createPanel() {

    const panel = new GUI({ width: 310 });

    const folder1 = panel.addFolder('Visibility');


    settings = {
        'Personal camera': true,
        'Skeleton': false

    };
    folder1.add(settings, 'Personal camera').onChange(changePersonCamera);
    folder1.add(settings, 'Skeleton').onChange((Visibility) => {
        character.skeleton.visible = Visibility
    });
    folder1.open();



}

function changePersonCamera(Visibility) {
    isPersoncamera = Visibility
}

function animate() {

    // Render loop

    requestAnimationFrame(animate);
    physicsWorld.step(1 / 60);
    // Lấy thời gian đã trôi qua kể từ khung cuối cùng, được sử dụng để cập nhật bộ trộn (nếu không ở chế độ một bước)
    mixerUpdateDelta = clock.getDelta();

    // Nếu ở chế độ một bước, thực hiện một bước và không làm gì cả (cho đến khi người dùng nhấp lại)

    if (singleStepMode) {
        mixerUpdateDelta = sizeOfNextStep;
        sizeOfNextStep = 0;

    }

    if (character && character.mixer) {

        character.update(mixerUpdateDelta);
        if (isPersoncamera)
            character.updateCameraTarget()
    }

    if (maplevel.blocks.length > 0)
        maplevel.update(mixerUpdateDelta)
    stats.update();


    cannonDebugger.update()
    composer.render()
    renderer.render(scene, camera);

}





