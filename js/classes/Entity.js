export default class Entity {
    constructor(x = 0, y = 0, radius = 0) { // Valores predefinidos para agrupamento
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.isDead = false; // Usado para filtragem, ativo para agrupamento
        this.active = true; // Para agrupamento de objetos
    }
    draw(ctx) {}
    update() {}
    // Método de reinicialização para agrupamento
    reset() {
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.isDead = false;
    }
}
