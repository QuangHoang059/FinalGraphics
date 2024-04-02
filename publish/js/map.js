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
    texturetarget = this.loadTexture.load('publish/image/x.png')
    grounds = []
    blocks = []
    margin = 0.1
    groundheight = 4
    geometry = new THREE.BoxGeometry(this.groundSize, this.groundheight, this.groundSize);
    material = new THREE.MeshPhysicalMaterial({
        map: this.texturemap,
        flatShading: true,
        color: 0xd9dcde,
        clearcoat: 1,
        iridescenceIOR: 1.7,
        emissive: 0xc16c6c,
    });
    edges = new THREE.EdgesGeometry(this.geometry);
    line = new THREE.LineSegments(this.edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 4 }));
    lastCollisionTime
    constructor(scene, physicsWorld, character) {
        this.scene = scene
        this.physicsWorld = physicsWorld
        this.character = character
    }
    setCharacter(character) {
        this.character = character
    }
    async initMap(level) {
        await this.load(level).then(((structure) => {
            this.structure = structure
            for (var i = 0; i < structure.length; i++) {
                for (var j = 0; j < structure[i].length; j++) {
                    if (structure[i][j] != WALL) {
                        if (structure[i][j] == TARGET) {
                            this.material = new THREE.MeshPhysicalMaterial({
                                map: this.texturetarget,
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
        // return this.blocks
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
    checkMove(block) {


    }
    update(mixerUpdateDelta) {
        for (let i = 0; i < this.blocks.length; i++) {
            this.blocks[i].update()
        }
        for (let i = 0; i < this.grounds.length; i++) {
            this.grounds[i].ground.position.copy(this.grounds[i].body.position)
            this.grounds[i].ground.quaternion.copy(this.grounds[i].body.quaternion)
        }


        var collidingBlock = null;
        var isCollidingWithBlock = this.blocks.some((block) => {

            var distance = this.character.model.position.distanceTo(block.cube.position);
            if (distance < WIDTH - 1) {
                collidingBlock = block
                return true
            }
            return false
        }
        );

        if (isCollidingWithBlock) {
            if (this.character.ismover == true) {
                this.character.togglePush = true
                collidingBlock.move(mixerUpdateDelta, this.character.currentAction, this.character.directionOffset)
                // collidingBlock.setisavailabel(0)

                this.lastCollisionTime = Date.now();
            }
        }
        else {

            var currentCollisionTime = Date.now()
            if (this.lastCollisionTime !== null && (currentCollisionTime - this.lastCollisionTime) >= 300) {
                this.character.togglePush = false;
                this.lastCollisionTime = null;
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
}

