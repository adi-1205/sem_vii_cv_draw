class ClickManager {
    constructor() {
        this.clicked = false;
        this.lockedOn = new Date();
    }

    handleClick() {
        if(this.lockedOn - new Date() < 1000) return;
        this.clicked = true;
        this.lockedOn = new Date();
    }

    reset() {
        this.clicked = false;
    }
}