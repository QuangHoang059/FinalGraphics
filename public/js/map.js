import * as THREE from 'three'
import { Block } from './block.js'
import { Character } from './character.js';

const KEYA = document.getElementById('A')
const KEYS = document.getElementById('S')
const KEYW = document.getElementById('W')
const KEYD = document.getElementById('D')
const KEYACTION = { [W]: KEYW, [A]: KEYA, [S]: KEYS, [D]: KEYD }
export class MapLevel {
    structure = []
    position_player = new THREE.Vector2()
    scene
    physicsWorld
    groundSize = WIDTH;
    loadTexture = new THREE.TextureLoader()
    texturemap = this.loadTexture.load('image/square-outline-textured.png')
    bumpturemap = this.loadTexture.load("image/13105-bump.jpg")
    texturetarget = this.loadTexture.load('image/x.png')
    grounds = []
    blocks = []
    margin = 0.1
    groundheight = 4
    geometry = new THREE.BoxGeometry(this.groundSize, this.groundheight, this.groundSize);
    material = new THREE.MeshPhysicalMaterial({
        map: this.texturemap,
        bumpMap: this.bumpturemap,
        flatShading: true,
        color: 0xd9dcde,
        clearcoat: 1,
        iridescenceIOR: 1.7,
        emissive: 0xc16c6c,
    });

    lastCollisionTime
    isavailabel = { [W]: true, [A]: true, [S]: true, [D]: true }
    currentAction = W
    iswin = false
    isloss = false
    currentTime = 0
    starttime
    isvalid = true
    isload = false
    ismovebox = false
    constructor(scene, camera, physicsWorld) {
        this.scene = scene
        this.physicsWorld = physicsWorld
        this.camera = camera

    }
    init(level, callback) {

        this.character = new Character(this.scene, this.camera, this.physicsWorld, new THREE.Vector3(0, 0, 0), 'Idle', 0.2)
        this.character.initModel().then(() => {
            this.initMap(level).then(() => {
                setTimeout(() => {
                    this.character.setPosition(new THREE.Vector3(this.position_player.x, 0, this.position_player.y))
                    this.createEvent()
                    this.isload = true
                    callback()
                }, 300)

            }
            )
        })
    }
    async initMap(level) {
        await this.load(level, (position) => {
            this.position_player = position
        }).then(((structure) => {
            this.structure = structure
            for (var i = 0; i < structure.length; i++) {
                for (var j = 0; j < structure[i].length; j++) {
                    if (structure[i][j] != WALL) {
                        if (structure[i][j] == TARGET || structure[i][j] == TARGET_FILLED) {
                            this.material = new THREE.MeshPhysicalMaterial({
                                map: this.texturetarget,
                                bumpMap: this.bumpturemap,
                                flatShading: true,
                                color: 0xcaafaf,
                                clearcoat: 1,
                                iridescenceIOR: 1.7,
                                emissive: 0x000000,
                            });
                        }
                        else {

                            this.material = new THREE.MeshPhysicalMaterial({
                                map: this.texturemap,
                                bumpMap: this.bumpturemap,
                                flatShading: true,
                                color: 0xd9dcde,
                                clearcoat: 1,
                                iridescenceIOR: 1.7,
                                emissive: 0xc16c6c,
                            });
                        }
                        var create = this.createGround(i, j)
                        var ground = create[0]
                        var body = create[1]
                        this.scene.add(ground);
                        this.grounds.push({ 'ground': ground, 'body': body });
                        if (structure[i][j] == BOX || structure[i][j] == TARGET_FILLED) {
                            var istagert = (structure[i][j] == TARGET_FILLED) ? false : true
                            var position = new THREE.Vector3(i * this.groundSize, WIDTH / 2, j * this.groundSize)
                            var block = new Block(this.scene, this.physicsWorld, istagert, position)
                            this.blocks.push(block)

                        }
                    }
                }
            }

        }))
        this.starttime = Date.now()
    }
    changeGeometryCube(isTeaport) {
        console.log(this.blocks);
        if (isTeaport) {
            this.blocks.forEach((block) => {
                block.changeGeometry(isTeaport)
            })
        }
        else {
            this.blocks.forEach((block) => {
                block.changeGeometry(isTeaport)
            })
        }

    }
    createEvent() {
        document.addEventListener('keydown', (event) => {
            if (this.character.ismover == false) {
                if (event.shiftKey && this.character) {
                    // this.character.switchRunToggle();
                } else {
                    let key = event.key.toLowerCase()

                    if (this.isavailabel[key] && key in KEYACTION) {
                        KEYACTION[key].classList.add('action')
                        this.character.keysPressed[key] = true;

                        this.currentAction = key
                    }
                }
            }

        }, false);

        document.addEventListener('keyup', (event) => {
            let key = event.key.toLowerCase()
            if (key in KEYACTION) {

                KEYACTION[key].classList.remove('action')
                this.character.keysPressed[key] = false;
            }

        }, false);

        Object.keys(KEYACTION).forEach((key, index) => {
            if (key in KEYACTION) {
                KEYACTION[key].addEventListener('touchstart', (event) => {
                    if (this.isavailabel[key]) {
                        KEYACTION[key].classList.add('action')
                        this.character.keysPressed[key] = true;
                        this.currentAction = key
                    }
                })
                KEYACTION[key].addEventListener('mousedown', (event) => {
                    if (this.isavailabel[key]) {
                        KEYACTION[key].classList.add('action')
                        this.character.keysPressed[key] = true;
                        this.currentAction = key
                    }
                })

                KEYACTION[key].addEventListener('touchend', (event) => {
                    KEYACTION[key].classList.remove('action')
                    this.character.keysPressed[key] = false;
                }, false)
                KEYACTION[key].addEventListener('mouseup', (event) => {
                    KEYACTION[key].classList.remove('action')
                    this.character.keysPressed[key] = false;
                }, false)
            }

        })
    }
    createGround(x, y) {

        var ground = new THREE.Mesh(this.geometry, this.material);


        ground.position.x = x * this.groundSize - this.margin;
        ground.position.y = -this.groundheight / 2
        ground.position.z = y * this.groundSize - this.margin;

        ground.receiveShadow = true
        var shape = new CANNON.Box(new CANNON.Vec3(WIDTH / 2, this.groundheight / 2, WIDTH / 2));
        this.groudPhysMat = new CANNON.Material()
        var body = new CANNON.Body({
            mass: 0,
            shape: shape,
            type: CANNON.Body.DYNAMIC,
            material: this.groudPhysMat,
            collisionFilterGroup: GROUP1,
            collisionFilterMask: GROUP2 | GROUP3
        });
        body.position.copy(ground.position)
        body.quaternion.copy(ground.quaternion);

        this.physicsWorld.addBody(body);
        return [ground, body]
    }
    checkWin() {
        for (let i = 0; i < this.blocks.length; i++) {
            if (this.blocks[i].isTagert == 1) {
                return false
            }
        }
        this.iswin = true
        this.isavailabel = { [W]: false, [A]: false, [S]: false, [D]: false }
        return true
    }
    checkLoss(obj) {
        try {
            var x = Math.round(obj.position.x / WIDTH)
            var y = Math.round(obj.position.z / WIDTH)
            if (this.structure[x][y] == WALL) {
                this.isloss = true
                this.isavailabel = { [W]: false, [A]: false, [S]: false, [D]: false }
                let index = 0;
                const intervalId = setInterval(() => {
                    if (index >= this.grounds.length) {
                        clearInterval(intervalId); // Dừng vòng lặp khi đã xử lý hết tất cả các ground
                        return;
                    }

                    var ground = this.grounds[index];

                    ground.body.mass = 1;
                    ground.body.updateMassProperties(true);

                    index++; // Tăng chỉ số để xử lý ground tiếp theo
                }, 200); // Thực hiện mỗi 0.2 giây

            }
        }
        catch (err) {
            this.isloss = true
            this.isavailabel = { [W]: false, [A]: false, [S]: false, [D]: false }
        }

    }
    checkMoveBlock(obj, walkDirection) {
        var x = walkDirection.x + Math.round(obj.cube.position.x / WIDTH)
        var y = walkDirection.z + Math.round(obj.cube.position.z / WIDTH)
        if (x >= 0 && x < this.structure.length && y >= 0 && y < this.structure[x].length) {
            if (this.structure[x][y] == BOX || this.structure[x][y] == TARGET_FILLED) {
                return 0
            }
        }
        return 1
    }
    checkMovecollidingBlock() {
        this.character._directionOffset()
        var x = this.character.walkDirection.x + Math.round(this.character.model.position.x / WIDTH)
        var y = this.character.walkDirection.z + Math.round(this.character.model.position.z / WIDTH)
        if (x >= 0 && x < this.structure.length && y >= 0 && y < this.structure[x].length) {
            if (this.structure[x][y] == BOX || this.structure[x][y] == TARGET_FILLED) {
                return this.blocks.find((block) => {
                    if (x == block.index.x && y == block.index.y) {
                        var isTrue = this.checkMoveBlock(block, this.character.walkDirection)
                        if (isTrue)
                            return block
                    }

                })
            }
        }
        return 0
    }
    checkMoveCharacter() {
        var x = this.character.walkDirection.x + Math.round(this.character.model.position.x / WIDTH)
        var y = this.character.walkDirection.z + Math.round(this.character.model.position.z / WIDTH)
        if (x >= 0 && x < this.structure.length && y >= 0 && y < this.structure[x].length) {
            if (this.structure[x][y] == AIR || this.structure[x][y] == TARGET || this.structure[x][y] == WALL) {
                return 1
            }
        }
        return 0
    }
    update(mixerUpdateDelta) {
        if (this.currentTime < TIMEOUT) {
            this.currentTime = Math.round((Date.now() - this.starttime) / 1000)
            document.getElementById('time-display').innerText = "  TIME: " + this.currentTime + "s/120s  ";
        }
        else {
            this.isloss = true
            this.isavailabel = { [W]: false, [A]: false, [S]: false, [D]: false }
        }

        if (this.iswin == false && this.isloss == false) {
            if (this.character.ismover == true) {
                this.checkLoss(this.character.model)
            }
            const directionPressed = DIRECTIONS.find(key => {
                return this.character.keysPressed[key];
            });
            if (directionPressed && this.ismovebox == false && this.character.ismover == false) {

                this.mixerUpdateDelta = mixerUpdateDelta
                var collidingBlock = null;

                collidingBlock = this.checkMovecollidingBlock()

                if (this.checkMoveCharacter() && this.isloss == false) {
                    this.isavailabel = { [W]: true, [A]: true, [S]: true, [D]: true }
                }
                else if (!collidingBlock) {
                    this.isavailabel[this.currentAction] = false
                }
                if (collidingBlock) {
                    // if (this.character.ismover == false)

                    this.ismovebox = true
                    this.character.togglePush = true
                    if (this.structure[Math.round(collidingBlock.cube.position.x / WIDTH)][Math.round(collidingBlock.cube.position.z / WIDTH)] == TARGET ||
                        this.structure[Math.round(collidingBlock.cube.position.x / WIDTH)][Math.round(collidingBlock.cube.position.z / WIDTH)] == TARGET_FILLED)
                        this.structure[Math.round(collidingBlock.cube.position.x / WIDTH)][Math.round(collidingBlock.cube.position.z / WIDTH)] = TARGET
                    else
                        this.structure[Math.round(collidingBlock.cube.position.x / WIDTH)][Math.round(collidingBlock.cube.position.z / WIDTH)] = AIR
                    collidingBlock.move(mixerUpdateDelta, this.character.currentAction, this.character.directionOffset,
                        (position) => {

                            if (position) {
                                collidingBlock.body.position.x = Math.round(position.x)
                                collidingBlock.body.position.z = Math.round(position.z)
                                collidingBlock.index = { x: Math.round(position.x / WIDTH), y: Math.round(position.z / WIDTH) }
                                if (this.structure[Math.round(position.x / WIDTH)][Math.round(position.z / WIDTH)] == TARGET) {
                                    this.structure[Math.round(position.x / WIDTH)][Math.round(position.z / WIDTH)] = TARGET_FILLED
                                    if (collidingBlock.isTagert == 1) {
                                        collidingBlock.setisTagert(0)
                                        collidingBlock.needsUpdate = true
                                    }
                                }
                                else {
                                    if (collidingBlock.isTagert == 0) {
                                        collidingBlock.setisTagert(1)
                                        collidingBlock.needsUpdate = true
                                    }
                                    if (this.structure[Math.round(position.x / WIDTH)][Math.round(position.z / WIDTH)] != WALL)
                                        this.structure[Math.round(position.x / WIDTH)][Math.round(position.z / WIDTH)] = BOX
                                }
                                this.checkWin()

                            }
                            this.checkLoss(collidingBlock.cube)
                            this.ismovebox = false


                        })

                    this.lastCollisionTime = Date.now();


                }
                else {
                    var currentCollisionTime = Date.now()
                    if (this.lastCollisionTime !== null && (currentCollisionTime - this.lastCollisionTime) >= 250) {
                        this.character.togglePush = false;
                        this.lastCollisionTime = null;
                    }

                }
                this.character.moveCharacter(mixerUpdateDelta, directionPressed, this.isavailabel)
            }
        }

        this.grounds.forEach((ground) => {
            ground.ground.position.copy(ground.body.position)
            ground.ground.quaternion.copy(ground.body.quaternion)

        })
        for (let i = 0; i < this.blocks.length; i++) {
            this.blocks[i].update()
        }
        this.character.update(mixerUpdateDelta);

    }

    async load(level, callback) {
        const levelFilePath = `sokobanLevels/test${level}.txt`
        let structure = []
        const response = await fetch(levelFilePath)
        const text = await response.text();
        const rows = text.split('\n');

        for (let y = 0; y < rows.length - 1; y++) {
            let level_row = [];

            for (let x = 0; x < rows[y].length; x++) {
                if (rows[y][x] === ' ') {
                    level_row.push(AIR);
                } else if (rows[y][x] === '#') {
                    level_row.push(WALL);
                } else if (rows[y][x] === 'B') {
                    level_row.push(BOX);
                } else if (rows[y][x] === '.') {
                    level_row.push(TARGET);
                } else if (rows[y][x] === 'X') {
                    level_row.push(TARGET_FILLED);
                } else if (rows[y][x] === '&') {
                    level_row.push(AIR);
                    this.position_player.set(y * this.groundSize, x * this.groundSize);
                    callback(this.position_player)
                }
            }
            structure.push(level_row);
        }


        return structure;

    }


}