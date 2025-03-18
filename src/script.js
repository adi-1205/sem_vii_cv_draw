const canvas = document.getElementById('handCanvas');
const ctx = canvas.getContext('2d');
let grabbed = false;
const points = [];
const subPoints = [];
let isPainting = false;
let clickManager = new ClickManager();
let colorManager = new ColorManager();
let cursor = { x: 0, y: 0 };
let thumb = {x: 0, y: 0};
let lineHeight = 2;
let lineHeightRect = {
    x: 10,
    y: 200,
    width: 40, 
    height: 100 
}

const socket = new WebSocket('ws://localhost:8765');

colorManager.createColorOptions();

socket.onopen = () => {
    console.log("Connected to WebSocket server.");
};

socket.onmessage = (event) => {
    const handData = JSON.parse(event.data);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPaintPoints(points);
    handData.forEach(hand => {

        isPainting = hand[0].hand == 'Right' ?
            (Math.hypot(hand[8].x - hand[12].x, hand[8].y - hand[12].y)) < 0.05 : false;

        clicked = 
            hand[0].hand == 'Right' ? 
            clickManager.handleClick() : clickManager.reset();
        
        if(hand[8].hand == 'Right' && isHoveringRect(cursor, thumb)){
            const distance = Math.hypot(hand[8].x - hand[4].x, hand[8].y - hand[4].y);
            lineHeight = parseInt(lerp(distance, 0.03, 0.12, 2, 10));
        }
        
        hand.forEach((landmark, idx) => {
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;

            if (landmark.hand === 'Right') {
                if (idx === 4) {
                    thumb = { x, y };
                }
                if(!isHoveringRect(cursor, thumb))
                    colorManager.selectColor(x, y);
                if (idx === 8) {
                    cursor = { x, y };
                    if(isPainting && !isHoveringRect(cursor, thumb)) {
                        const prevPoint = subPoints[subPoints.length - 1];
                        if (!prevPoint || Math.hypot(x - prevPoint.x, y - prevPoint.y) > 5) {
                            subPoints.push({ x, y, hand: landmark.hand });
                        }   
                        drawSubPoints(subPoints, colorManager.selectedColor, true, lineHeight);                     
                        drawCircle('black', x, y);
                    } else {
                        if (subPoints.length)
                            points.push({subPoints: deepCopyArr(subPoints), color: colorManager.selectedColor, lineHeight});
                        subPoints.length = 0;
                        drawPaintPoints(points);
                    }
                }
                drawCircle('red', x, y, 3, {alpha:isPainting ? 0.2 : 1});
            }

        });
    });
    colorManager.createColorOptions();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(lineHeightRect.x, lineHeightRect.y, lineHeightRect.width, lineHeightRect.height);
    ctx.font = '10px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText('Stroke', lineHeightRect.x + 5, lineHeightRect.y + 20);
    ctx.font = '24px Arial';
    ctx.fillText(lineHeight, lineHeightRect.x + 12, lineHeightRect.y + 60);
};

socket.onerror = (error) => {
    console.error("WebSocket Error: " + error);
};

socket.onclose = () => {
    console.log("Disconnected from WebSocket server.");
};

function drawCircle(color, x, y, r=3, options = {}) {
    ctx.save()
    if(options.alpha){
        ctx.globalAlpha = options.alpha
    }
        
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    if(options.stroke) {
        ctx.lineWidth = options.lineWidth ?? 5;
        ctx.strokeStyle = options.stroke;
        ctx.stroke();
    }
    ctx.restore()
}

function deepCopyArr(arr) {
    return JSON.parse(JSON.stringify(arr));
}


function drawPaintPoints(points) {
    points.forEach(({subPoints, color, lineHeight}) => {
        drawSubPoints(subPoints, color, false, lineHeight);
    });
}

function drawSubPoints(subPoints, color = 'black', skipSmoothing = false, lh) {
    const lw = color == 'white' ? lh + 20 : lh;
    if(skipSmoothing) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.moveTo(subPoints[0].x, subPoints[0].y);
        subPoints.forEach(({x, y}) => ctx.lineTo(x, y));
        ctx.stroke();
        return
    }
    if (subPoints.length < 2) return; // Need at least 2 subPoints to draw

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;

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
    lineHeight = 2
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

function isHoveringRect(cursor, thumb) {
    const isCursorInside = cursor.x >= lineHeightRect.x &&
        cursor.x <= lineHeightRect.x + lineHeightRect.width &&
        cursor.y >= lineHeightRect.y &&
        cursor.y <= lineHeightRect.y + lineHeightRect.height;

    const isThumbInside = thumb.x >= lineHeightRect.x &&
        thumb.x <= lineHeightRect.x + lineHeightRect.width &&
        thumb.y >= lineHeightRect.y &&
        thumb.y <= lineHeightRect.y + lineHeightRect.height;

    return isCursorInside && isThumbInside;
}


function lerp(value, min1, max1, min2, max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}