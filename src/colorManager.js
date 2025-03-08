class ColorManager {
    constructor() {
        this.colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white'];
        this.colorPos = this.colors.map((color, ind) => ({ x: 20 + ind * 30, y: 20, color }));
        this.x = 20;
        this.y = 20;
        this.r = 10;
        this.gap = 10;
        this.selectedColor = 'black';
    }

    createColorOptions() {
        this.colors.forEach((color, ind) => {
            if (this.selectedColor === color)
                drawCircle(color, this.computeX(ind), this.y, this.r, { stroke: color == 'black' ? 'grey' : 'black' });
            drawCircle(color, this.computeX(ind), this.y, this.r, { stroke: color == 'white' ? 'black' : null, lineWidth: 1 });
            this.colorPos.push({ x: this.x + ind * (2 * this.r + this.gap), y: this.y, color });
        });
    }

    selectColor(x, y) {
        const selectedColor = this.colorPos.find(pos => Math.hypot(x - pos.x, y - pos.y) < this.r);
        if (selectedColor)
            this.selectedColor = selectedColor.color;
    }

    computeX(ind) {
        return this.x + ind * (2 * this.r + this.gap);
    }

    reset() {
        this.selectedColor = 'black';
        this.createColorOptions();
    }
}