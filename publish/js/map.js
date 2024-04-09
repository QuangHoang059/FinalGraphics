import * as THREE from 'three'
import { Block } from './block.js'
export class MapLevel {
    structure = []
    position_player = new THREE.Vector2()
    scene
    physicsWorld
    groundSize = WIDTH;
    loadTexture = new THREE.TextureLoader()
    texturemap = this.loadTexture.load('publish/image/square-outline-textured.png')
    bumpturemap = this.loadTexture.load("publish/image/13105-bump.jpg")
    texturetarget = this.loadTexture.load('publish/image/x.png')
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
    edges = new THREE.EdgesGeometry(this.geometry);
    line = new THREE.LineSegments(this.edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 4 }));
    lastCollisionTime
    isavailabel = { [W]: true, [A]: true, [S]: true, [D]: true }
    currentAction = W
    iswin = false
    isloss = false
    constructor(scene, physicsWorld, character) {
        this.scene = scene
        this.physicsWorld = physicsWorld
        this.character = character

    }
    setCharacter(character) {
        this.character = character
    }
    async initMap(level, calback) {
        await this.load(level).then(((structure) => {
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
                            var isavailabel = (structure[i][j] == TARGET_FILLED) ? false : true
                            var position = new THREE.Vector3(i * this.groundSize, WIDTH / 2, j * this.groundSize)
                            var block = new Block(this.scene, this.physicsWorld, isavailabel, position)

                            this.blocks.push(block)

                        }
                    }
                }
            }
        }))
        document.addEventListener('keydown', (event) => {
            if (this.character.ismover == false) {
                if (event.shiftKey && this.character) {
                    this.character.switchRunToggle();
                } else {

                    if (this.isavailabel[event.key.toLowerCase()]) {
                        this.character.keysPressed[event.key.toLowerCase()] = true;
                        this.currentAction = event.key.toLowerCase()
                    }
                }

            }
        }, false);
        document.addEventListener('keyup', (event) => {
            this.character.ismover = false
            this.character.keysPressed[event.key.toLowerCase()] = false;
        }, false);

        calback(this.position_player)
    }
    createGround(x, y) {

        var ground = new THREE.Mesh(this.geometry, this.material);
        ground.add(this.line)

        ground.position.x = x * this.groundSize - this.margin;
        ground.position.y = -this.groundheight / 2
        ground.position.z = y * this.groundSize - this.margin;

        ground.receiveShadow = true
        var shape = new CANNON.Box(new CANNON.Vec3(WIDTH / 2, this.groundheight / 2, WIDTH / 2));
        this.groudPhysMat = new CANNON.Material()
        var body = new CANNON.Body({
            mass: 0,
            shape: shape,
            material: this.groudPhysMat,
            collisionFilterGroup: GROUP1,
            collisionFilterMask: GROUP2 | GROUP3
        });
        body.position.copy(ground.position)
        body.quaternion.copy(ground.quaternion);
        this.physicsWorld.addBody(body);
        return [ground, body]
    }
    checkMoveBlock(obj) {
        this.character._directionOffset(this.character.directionOffset)

        var x = Math.round(this.character.walkDirection.x + obj.position.x / WIDTH)
        var y = Math.round(this.character.walkDirection.z + obj.position.z / WIDTH)
        if (x > 0 && y > 0 && x < this.structure.length && y < this.structure[0].length) {
            if (this.structure[x][y] == BOX || this.structure[x][y] == TARGET_FILLED) {
                return 0
            }

        }
        return 1
    }
    checkMoveCharacter() {

        this.character._directionOffset(this.character.directionOffset)

        var x = Math.round(this.character.walkDirection.x + this.character.model.position.x / WIDTH)
        var y = Math.round(this.character.walkDirection.z + this.character.model.position.z / WIDTH)
        if (x > 0 && y > 0 && x < this.structure.length && y < this.structure[0].length) {
            if (this.structure[x][y] == AIR) {
                return 1
            }
        }
        return 0
    }
    checkWin() {
        for (let i = 0; i < this.blocks.length; i++) {

            if (this.blocks[i].isavailabel == 1) {
                return false
            }
        }
        return true
    }
    update(mixerUpdateDelta) {
        // this.isloss = true
        if (this.iswin == false) {
            this.mixerUpdateDelta = mixerUpdateDelta
            for (let i = 0; i < this.blocks.length; i++) {
                this.blocks[i].update()
            }
            for (let i = 0; i < this.grounds.length; i++) {
                this.grounds[i].ground.position.copy(this.grounds[i].body.position)
                this.grounds[i].ground.quaternion.copy(this.grounds[i].body.quaternion)
            }

            var collidingBlock = null;
            var checkBlock = null

            var isCollidingWithBlock = this.blocks.some((block) => {
                var distance = this.character.model.position.distanceTo(block.cube.position);
                if (distance < WIDTH + 5) {
                    // console.log(distance);
                    checkBlock = block
                }
                if (distance < WIDTH - 1 && block.ismover == false) {
                    collidingBlock = block
                    return true
                }
                // return false
            }
            );


            if (checkBlock) {

                if (this.checkMoveCharacter() == 1) {
                    // console.log(2134);
                    this.isavailabel = { [W]: true, [A]: true, [S]: true, [D]: true }
                }
                else if (this.checkMoveBlock(checkBlock.cube) == 0) {

                    this.isavailabel[this.currentAction] = false
                }
                // else {
                //     this.character.isavailabel = true
                // }

            }
            // console.log(isCollidingWithBlock)
            if (isCollidingWithBlock && this.checkMoveBlock(collidingBlock.cube) == 1) {

                if (this.character.ismover == true && this.iswin == false) {
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
                                if (this.structure[Math.round(position.x / WIDTH)][Math.round(position.z / WIDTH)] == TARGET) {

                                    this.structure[Math.round(position.x / WIDTH)][Math.round(position.z / WIDTH)] = TARGET_FILLED
                                    if (collidingBlock.isavailabel == 1) {
                                        collidingBlock.setisavailabel(0)
                                        collidingBlock.needsUpdate = true
                                    }
                                }
                                else {
                                    if (collidingBlock.isavailabel == 0) {
                                        collidingBlock.setisavailabel(1)
                                        collidingBlock.needsUpdate = true
                                    }

                                    this.structure[Math.round(position.x / WIDTH)][Math.round(position.z / WIDTH)] = BOX
                                }
                            }

                        }
                    )
                    this.lastCollisionTime = Date.now();
                }
            }
            else {
                var currentCollisionTime = Date.now()
                if (this.lastCollisionTime !== null && (currentCollisionTime - this.lastCollisionTime) >= 350) {
                    this.character.togglePush = false;
                    this.lastCollisionTime = null;
                }
            }
            this.character.update(mixerUpdateDelta);
            if (this.checkWin()) {
                this.iswin = true
                this.isavailabel = { [W]: false, [A]: false, [S]: false, [D]: false }
            }
        }
    }

    async load(level) {
        const levelFilePath = `publish/sokobanLevels/test${level}.txt`
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
                }
            }
            structure.push(level_row);
        }


        return structure;

    }
    getKey() {

    }

}