// Funções de ajuda para os limites do Quadtree
function Rectangle(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
}

Rectangle.prototype.contains = function(point) {
    return (point.x >= this.x &&
            point.x < this.x + this.width &&
            point.y >= this.y &&
            point.y < this.y + this.height);
};

Rectangle.prototype.intersects = function(range) {
    return !(range.x > this.x + this.width ||
             range.x + range.width < this.x ||
             range.y > this.y + this.height ||
             range.y + range.height < this.y);
};


export default class Quadtree {
    constructor(bounds, capacity = 4) {
        this.bounds = bounds;
        this.capacity = capacity;
        this.points = [];
        this.divided = false;
    }

    subdivide() {
        let { x, y, width, height } = this.bounds;
        let w2 = width / 2;
        let h2 = height / 2;

        let ne = new Quadtree(new Rectangle(x + w2, y, w2, h2), this.capacity);
        let nw = new Quadtree(new Rectangle(x, y, w2, h2), this.capacity);
        let se = new Quadtree(new Rectangle(x + w2, y + h2, w2, h2), this.capacity);
        let sw = new Quadtree(new Rectangle(x, y + h2, w2, h2), this.capacity);

        this.northeast = ne;
        this.northwest = nw;
        this.southeast = se;
        this.southwest = sw;

        this.divided = true;
    }

    insert(point) {
        if (!this.bounds.contains(point)) {
            return false;
        }

        if (this.points.length < this.capacity) {
            this.points.push(point);
            return true;
        }

        if (!this.divided) {
            this.subdivide();
        }

        if (this.northeast.insert(point) ||
            this.northwest.insert(point) ||
            this.southeast.insert(point) ||
            this.southwest.insert(point)) {
            return true;
        }

        return false;
    }

    query(range, found = []) {
        if (!this.bounds.intersects(range)) {
            return found;
        }

        for (let p of this.points) {
            if (range.contains(p)) {
                found.push(p);
            }
        }

        if (this.divided) {
            this.northwest.query(range, found);
            this.northeast.query(range, found);
            this.southwest.query(range, found);
            this.southeast.query(range, found);
        }

        return found;
    }
}

// Also export Rectangle so it can be instantiated from other modules
export { Rectangle };
