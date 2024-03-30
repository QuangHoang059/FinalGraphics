// import * as from "./constans.js"

class MapLevel {
    structure = []
    max_width = 0
    position_player = []
    scene
    constructor(scene) {
        this.scene = scene
    }
    async load(level) {
        const levelFilePath = `publish/sokobanLevels/test${level}.txt`
        let structure = []
        const response = await fetch(levelFilePath)
        const text = await response.text();
        const rows = text.split('\n');

        for (let y = 0; y < rows.length - 1; y++) {
            let level_row = [];
            if (rows[y].length > this.max_width) {
                this.max_width = rows[y].length;
            }

            for (let x = 0; x < this.max_width; x++) {
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
                    this.position_player = [x, y];
                }
            }
            structure.push(level_row);
        }

        return structure;

    }
}

