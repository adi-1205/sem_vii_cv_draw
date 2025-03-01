const canvas = document.getElementById('handCanvas');
const ctx = canvas.getContext('2d');
let grabbed = false;
const points = [];
const subPoints = [];
let isPainting = false;
let clickManager = new ClickManager();
let colorManager = new ColorManager();
let cursor = { x: 0, y: 0 };

const socket = new WebSocket('ws://localhost:8765');

colorManager.createColorOptions();

socket.onopen = () => {
    console.log("Connected to WebSocket server.");
};

socket.onmessage = (event) => {
    const handData = JSON.parse(event.data);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    handData.forEach(hand => {

        isPainting = hand[0].hand == 'Right' ?
            (Math.hypot(hand[8].x - hand[12].x, hand[8].y - hand[12].y)) < 0.03 : false;
        if(hand[8].hand == 'Right')
            console.log(Math.hypot(hand[8].x - hand[12].x, hand[8].y - hand[12].y), hand[8].z, interpolate(hand[0].z));
        
        clicked = 
            hand[0].hand == 'Right' ? 
            clickManager.handleClick() : clickManager.reset();
        
        
        hand.forEach((landmark, idx) => {
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;

            if (landmark.hand === 'Right') {
                colorManager.selectColor(x, y);
                drawCircle('red', x, y);
                if (idx === 8) {
                    cursor = { x, y };
                    if(isPainting){
                        drawCircle('black', x, y);
                        const prevPoint = subPoints[subPoints.length - 1];
                        if (!prevPoint || Math.hypot(x - prevPoint.x, y - prevPoint.y) > 5) {
                            subPoints.push({ x, y, hand: landmark.hand });
                        }   
                        drawSubPoints(subPoints, colorManager.selectedColor, true);                     
                    } else {
                        if (subPoints.length)
                            points.push({subPoints: deepCopyArr(subPoints), color: colorManager.selectedColor});
                        subPoints.length = 0;
                    }
                }
            }

            // if (landmark.hand === 'Left') {
            //     drawCircle('blue', x, y);
            // }
        });
    });
    colorManager.createColorOptions();
    drawPaintPoints(points);
};

socket.onerror = (error) => {
    console.error("WebSocket Error: " + error);
};

socket.onclose = () => {
    console.log("Disconnected from WebSocket server.");
};

function drawCircle(color, x, y, r=3, options = {}) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    if(options.stroke) {
        ctx.lineWidth = 5;
        ctx.strokeStyle = options.stroke;
        ctx.stroke();
    }
}

function deepCopyArr(arr) {
    return JSON.parse(JSON.stringify(arr));
}


function drawPaintPoints(points) {
    points.forEach(({subPoints, color}) => {
        drawSubPoints(subPoints, color);
    });
}

function drawSubPoints(subPoints, color = 'black', skipSmoothing = false) {
    if(skipSmoothing) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.moveTo(subPoints[0].x, subPoints[0].y);
        subPoints.forEach(({x, y}) => ctx.lineTo(x, y));
        ctx.stroke();
        return
    }
    if (subPoints.length < 2) return; // Need at least 2 subPoints to draw

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.moveTo(subPoints[0].x, subPoints[0].y);

    for (let i = 1; i < subPoints.length - 1; i++) {
        if (subPoints[i].hand === 'Right' && subPoints[i - 1].hand === 'Right') {
            const prevPoint = subPoints[i - 1];
            const currentPoint = subPoints[i];
            const nextPoint = subPoints[i + 1];

            const controlX = currentPoint.x;
            const controlY = currentPoint.y;

            const endX = (currentPoint.x + nextPoint.x) / 2;
            const endY = (currentPoint.y + nextPoint.y) / 2;

            ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        }
    }

    if (subPoints.length > 2) {
        const lastPoint = subPoints[subPoints.length - 1];
        const secondLastPoint = subPoints[subPoints.length - 2];
        if (lastPoint.hand === 'Right' && secondLastPoint.hand === 'Right') {
            ctx.quadraticCurveTo(secondLastPoint.x, secondLastPoint.y, lastPoint.x, lastPoint.y);
        }
    }

    ctx.stroke();
    ctx.closePath();
}

function undo() {
    if(isPainting) return;
    points.pop();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPaintPoints(points);
}

function clearCanvas() {
    points.length = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    colorManager.reset();
}

window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'z') {
        undo();
    }

    if(event.key.toLowerCase() === 'c') {
        clearCanvas();
    }
});

function interpolate(b, b1 = -0.31, a1 = 0.09, b2 = -0.03, a2 = 0.04) {
    return a1 + ((b - b1) * (a2 - a1)) / (b2 - b1);
}
