import * as THREE from 'three'
import { FBXLoader } from 'three/loaders/FBXLoader.js';
export class Character {
    model
    mixer
    animationsMap = new Map()
    camera
    scene
    cameraAngle = 0
    pathAnimations = ['Walk', 'Run', 'Walk right', 'Walk left', 'Walk Backwards'];
    loadAnimation = new FBXLoader();
    keysPressed = {}
    // state
    toggleRun = true
    currentAction = 'Idle'
    // temporary data
    walkDirection = new THREE.Vector3()
    // trục quay
    rotateAngle = new THREE.Vector3(0, 1, 0)
    rotateQuarternion = new THREE.Quaternion()
    cameraTarget = new THREE.Vector3()

    // constants
    fadeDuration = 0.2
    runVelocity = 25
    walkVelocity = 15

    constructor(scene, camera, currentAction, fadeDuration = 0.2) {
        this.currentAction = currentAction
        this.fadeDuration = fadeDuration
        this.cameraAngle = 0
        this.camera = camera
        this.scene = scene
        this.initModel()

    }
    initModel() {
        const loader = new FBXLoader();
        this.loadAnimations()
            .then((animations) => {
                loader.load('publish/models/stickman/source/Idle.fbx', (gltf) => {

                    this.model = gltf;
                    this.model.scale.setScalar(0.002);


                    this.scene.add(this.model);
                    this.model.rotation.z = Math.PI
                    this.model.rotation.x = Math.PI
                    // set tạo bóng cho tất cả các mesh của this.model
                    this.model.traverse(function (object) {

                        if (object.isMesh) object.castShadow = true;

                    });
                    const axisHelper = new THREE.AxesHelper(10);

                    // Add the axis helper to the scene
                    this.scene.add(axisHelper);

                    // khởi tạo khung xương cho this.model
                    var skeleton = new THREE.SkeletonHelper(this.model);
                    skeleton.visible = false;
                    this.scene.add(skeleton);


                    // Thêm animation cho this.model
                    // lấy animations có sẵn trong this.model
                    animations.unshift(gltf.animations[0])
                    this.pathAnimations.unshift("Idle")
                    // thêm các hành động vào this.model để thực thực thi
                    this.mixer = new THREE.AnimationMixer(this.model);


                    animations.forEach((a, i) => {
                        a.name = this.pathAnimations[i]
                        this.animationsMap.set(a.name, this.mixer.clipAction(a))
                    })


                    document.addEventListener('keydown', (event) => {
                        if (event.shiftKey && this) {
                            this.switchRunToggle();
                        } else {
                            this.keysPressed[event.key.toLowerCase()] = true;
                        }
                    }, false);
                    document.addEventListener('keyup', (event) => {
                        this.keysPressed[event.key.toLowerCase()] = false;
                    }, false);

                    this.animationsMap.forEach((value, key) => {
                        if (key == this.currentAction) {
                            value.play()
                        }
                    })
                    this.updateCameraTarget()

                })
            })
    }

    // load animation
    async loadAnimations() {
        let animations = [];
        var PATH = 'publish/animation';
        for (let i = 0; i < this.pathAnimations.length; i++) {
            await new Promise((resolve, reject) => {
                this.loadAnimation.load(PATH + '/' + this.pathAnimations[i] + ".fbx", function (gltf) {
                    gltf.scale.setScalar(0.0001);
                    animations.push(gltf.animations[0]);
                    resolve();
                });
            });
        }
        return animations
    }

    switchRunToggle() {
        this.toggleRun = !this.toggleRun
    }

    update(delta) {
        const directionPressed = DIRECTIONS.some(key => this.keysPressed[key] == true)

        var play = '';
        if (directionPressed && this.toggleRun) {
            play = 'Run'
        } else if (directionPressed) {
            play = 'Walk'
        } else {
            play = 'Idle'
        }

        if (this.currentAction != play) {
            const toPlay = this.animationsMap.get(play)
            const current = this.animationsMap.get(this.currentAction)

            current.fadeOut(this.fadeDuration)
            toPlay.reset().fadeIn(this.fadeDuration).play();

            this.currentAction = play
        }

        this.mixer.update(delta)

        if (this.currentAction == 'Run' || this.currentAction == 'Walk') {

            // bù góc chuyển động chéo
            var directionOffset = this._directionOffset(this.keysPressed)

            // quay mô hình
            this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, directionOffset + Math.PI)
            // thông số 2 là độ mượt khi quay theo từng step
            this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.1)

            // tính direction
            this.camera.getWorldDirection(this.walkDirection)
            this.walkDirection.y = 0
            this.walkDirection.normalize()

            this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset)

            // run/walk velocity
            const velocity = this.currentAction == 'Run' ? this.runVelocity : this.walkVelocity

            // move model & camera
            const moveX = this.walkDirection.x * velocity * delta
            const moveZ = this.walkDirection.z * velocity * delta
            this.model.position.x += moveX
            this.model.position.z += moveZ
            this.updateCameraTarget()
        }
    }

    updateCameraTarget() {

        this.cameraAngle = THREE.MathUtils.lerp(this.cameraAngle, 0, 0.01);
        this.camera.position.setFromSphericalCoords(100, 0.7, this.cameraAngle);
        this.camera.position.add(this.model.position);
        this.camera.lookAt(this.model.position);
    }

    _directionOffset() {
        var directionOffset = 0 // w

        if (this.keysPressed[W]) {
            if (this.keysPressed[A]) {
                directionOffset = Math.PI / 4 // w+a
            } else if (this.keysPressed[D]) {
                directionOffset = - Math.PI / 4 // w+d
            }
        } else if (this.keysPressed[S]) {
            if (this.keysPressed[A]) {
                directionOffset = Math.PI / 4 + Math.PI / 2 // s+a
            } else if (this.keysPressed[D]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d
            } else {
                directionOffset = Math.PI // s
            }
        } else if (this.keysPressed[A]) {
            directionOffset = Math.PI / 2 // a
        } else if (this.keysPressed[D]) {
            directionOffset = - Math.PI / 2 // d
        }

        return directionOffset
    }
}