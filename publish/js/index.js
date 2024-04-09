
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import Stats from 'three/examples/jsm/libs/stats.module'
import { Character } from './character.js';
import { MapLevel } from './map.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js';

import TWEEN from '@tweenjs/tween.js'

import CannonDebugger from 'cannon-es-debugger'
// import { Timer } from 'three/examples/jsm/Addons.js';
let physicsWorld
let scene, renderer, camera, stats, controls, composer
let character, clock, maplevel, mixerUpdateDelta, changemap, buttonreset, istop = false
const margin = 0.05;
let isPersoncamera = true
let settings;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const loadreset = new FBXLoader()
// tham số để thể hiện tưng hành động theo  các bước (gióng slow motion)
let singleStepMode = false;
let sizeOfNextStep = 0;
let level = 1
let cannonDebugger
init();
function init() {
    initGraphis()
    initOBJ(level)
    animate();
}

function initGraphis() {
    scene = new THREE.Scene();
    const loadTexture = new THREE.TextureLoader();
    const texturebackground = loadTexture.load('publish/image/background.jpg')
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
    renderPixelatedPass.normalEdgeStrength = 1
    renderPixelatedPass.depthEdgeStrength = 1
    composer.addPass(renderPixelatedPass)
    const glitchPass = new GlitchPass();
    composer.addPass(glitchPass);
    const luminosityPass = new ShaderPass(LuminosityShader);
    composer.addPass(luminosityPass);

    // init controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    //init stats
    stats = Stats()
    document.body.appendChild(stats.dom)

    // Lấy thời gian
    clock = new THREE.Clock();
    // thiết lập thế giới vật lý 
    physicsWorld = new CANNON.World();
    physicsWorld.gravity.set(0, -9.8, 0); // Thiết lập trọng lực
    physicsWorld.broadphase = new CANNON.NaiveBroadphase();

    physicsWorld.defaultContactMaterial.contactEquationStiffness = 1e7;
    physicsWorld.defaultContactMaterial.contactEquationRelaxation = 5;

    window.addEventListener('resize', () => {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

    });


}

var latertime = Date.now();


function clearScene() {
    scene.clear()
    istop = false
    isPersoncamera = true
    var bodies = physicsWorld.bodies;
    for (var i = bodies.length - 1; i >= 0; i--) {
        physicsWorld.removeBody(bodies[i]);
    }
}
function onPointerMove(event) {


    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects([changemap, buttonreset], true);

    if (intersects.length > 0) {

        const res = intersects.filter(function (res) {

            return res && res.object;

        })[0];

        if (res && res.object) {
            var currenttime = Date.now()
            if (currenttime - latertime > 1200) {

                if (res.object.name == 'boxmap') {
                    if (event.button == 0) {

                        level += 1
                        if (level > 18) level = 18
                    }
                    else if (event.button == 2) {
                        console.log(7676);
                        level -= 1
                        if (level < 1) level = 1
                    }
                    clearScene()
                    initOBJ(level)
                    latertime = currenttime
                }
                else if (res.object.name == "button2") {
                    clearScene()
                    initOBJ(level)
                    latertime = currenttime
                }
            }


        }

    }

}

window.addEventListener('pointerdown', onPointerMove)
function initOBJ(level) {


    // thêm tọa độ
    const axisHelper = new THREE.AxesHelper(10);
    scene.add(axisHelper);

    // create Directional light
    const pointLight = new THREE.PointLight(0xffffff, 10000);
    pointLight.position.set(20, 50, 60);
    pointLight.castShadow = true;
    scene.add(pointLight);

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
        maplevel.initMap(level, (position) => {
            var position_player = position
            character.setPosition(new THREE.Vector3(position_player.x, 0, position_player.y))
        }).then(() => {
            maplevel.setCharacter(character)
            createPanel()
        }
        )

        //đổi map
        createChangeMap(level)

        // load model reset
        createResetMap()

    })



    cannonDebugger = new CannonDebugger(scene, physicsWorld, {
        // options...
    })
}
function createText(text, color = 0xffffff) {
    const loader = new FontLoader();
    loader.load('node_modules/three/examples/fonts/droid/droid_sans_bold.typeface.json', function (font) {
        // Define text parameters
        const textParams = {
            font: font,
            size: 30,
            depth: 10,
            curveSegments: 4,
            bevelThickness: 2,
            bevelSize: 1.5,
            bevelEnabled: true

        };
        const loadTexture = new THREE.TextureLoader()
        let texturemap
        if (text == 'win')
            texturemap = loadTexture.load('publish/image/texture_win.jpg')
        else
            texturemap = loadTexture.load('publish/image/texture_lose.jpg')
        const geometryW = new TextGeometry(text, textParams);

        const material = new THREE.MeshPhysicalMaterial({ reflectivity: 0.5, color: color, transparent: true, opacity: 0, map: texturemap });

        const TEX = new THREE.Mesh(geometryW, material);
        TEX.position.set(0, 130, 50);
        TEX.rotateX(-Math.PI / 4)
        const LightTex = new THREE.PointLight(0xffffff, 2000);
        LightTex.position.set(30, 150, 90);
        scene.add(TEX, LightTex);
        animateTextAppear(TEX)
    });
}
function createResetMap() {
    loadreset.load('publish/models/uploads_files_2691895_button.fbx', (model) => {
        model.scale.setScalar(0.09)
        model.rotation.x = Math.PI / 2

        var geometry = new THREE.BoxGeometry(18, 18, 1);
        var material = new THREE.MeshPhysicalMaterial({

            flatShading: true,
            color: 0xC71A0D,
            clearcoat: 1,
            iridescenceIOR: 1.7,
            // emissive: 0xc16c6c,
        });
        var solebutton = new THREE.Mesh(geometry, material,);

        buttonreset = new THREE.Group();
        solebutton.position.set(0, 0, -1)
        buttonreset.add(solebutton)
        buttonreset.add(model)
        buttonreset.position.set(0, 0, -20)
        buttonreset.rotation.x = -Math.PI / 2
        buttonreset.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
            }
        })
        buttonreset.scale.setScalar(0.7)
        const LightTex = new THREE.PointLight(0xffffff, 2000);
        LightTex.position.set(-5, 15, -30);

        scene.add(buttonreset, LightTex)

    })
}
function createChangeMap(level) {
    const loadTexture = new THREE.TextureLoader()
    const texturechangemap = loadTexture.load('publish/image/' + level + '.jpg')
    var geometry = new THREE.BoxGeometry(15, 15, 15, 10, 10, 10);
    var material = new THREE.MeshStandardMaterial({
        color: 0xCF8753,
        map: texturechangemap
    });
    changemap = new THREE.Mesh(geometry, material,);
    changemap.position.set(50, 30, -40);
    var edges = new THREE.EdgesGeometry(geometry);
    var line = new THREE.LineSegments
        (edges, new THREE.LineDashedMaterial({
            color: 0x000000, linewidth: 10, fog: true
        }));
    changemap.add(line)
    changemap.name = "boxmap"
    scene.add(changemap);
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
function updateChangamap(mixerUpdateDelta) {
    if (changemap) {
        changemap.rotation.x += mixerUpdateDelta / 2

        changemap.rotation.y += mixerUpdateDelta / 2
        changemap.rotation.z += mixerUpdateDelta / 2
    }

}
//animation to end game
function animationEndGame() {
    isPersoncamera = false

    const cameraMoveTween = new TWEEN.Tween(camera.position)
        .to(new THREE.Vector3(50, 200, 150), 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onStart(() => {
            controls.enabled = false;
        })
        .onComplete(() => {
            controls.enabled = true;

        })
    const changeMapMoveTween = new TWEEN.Tween(changemap.position)
        .to(new THREE.Vector3(100, 150, 100), 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
    const resetMapMoveTween = new TWEEN.Tween(buttonreset.position)
        .to(new THREE.Vector3(-10, 150, 100), 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)

    const resetMapRotateTween = new TWEEN.Tween(buttonreset.rotation)
        .to({ x: -Math.PI / 4 }, 2000)

        .easing(TWEEN.Easing.Quadratic.InOut);


    cameraMoveTween.start()
    changeMapMoveTween.start()
    resetMapMoveTween.start()
    resetMapRotateTween.start()
}
// animation to appearent text when end game
function animateTextAppear(text) {
    const fadeInDuration = 3000;
    new TWEEN.Tween(text.material)
        .to({ opacity: 1 }, fadeInDuration)
        .easing(TWEEN.Easing.Bounce.Out)

        .start();
}
function animate() {

    // Render loop
    requestAnimationFrame(animate);


    // Lấy thời gian đã trôi qua kể từ khung cuối cùng, được sử dụng để cập nhật bộ trộn (nếu không ở chế độ một bước)
    mixerUpdateDelta = clock.getDelta();


    // Nếu ở chế độ một bước, thực hiện một bước và không làm gì cả (cho đến khi người dùng nhấp lại)

    if (singleStepMode) {
        mixerUpdateDelta = sizeOfNextStep;
        sizeOfNextStep = 0;

    }

    if (maplevel.blocks.length > 0) {
        maplevel.update(mixerUpdateDelta)
        if (maplevel.iswin == true && istop == false) {

            createText('WIN',)
            animationEndGame()
            istop = true
        }
        else if (maplevel.isloss == true && istop == false) {

            createText('LOSS',)
            animationEndGame()
            istop = true
        }
    }
    if (character && character.mixer) {
        if (isPersoncamera)
            character.updateCameraTarget()
    }
    updateChangamap(mixerUpdateDelta)


    TWEEN.update()

    cannonDebugger.update()
    composer.render()
    renderer.render(scene, camera);

    physicsWorld.step(1 / 60);

    stats.update();

}

