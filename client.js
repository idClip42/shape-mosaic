function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

let canvas;
let ctx;
let canvas2;
let ctx2;
let images = [];
let imgCount = 0;
let baseImg1;
let baseImg2;
let baseImg2TransformSet = [];

let deltaTime = 0;
let previousTime = (new Date()).getTime();

let started = false;


// const CANVAS_WIDTH = 800;
// const CANVAS_HEIGHT = 600;
const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;

const TIME = {
    IMG_ENTER : 0.25,
    IMG_DISPLAY : 3.0,
    WAIT : 1,
    PHASE_2_DELAY : 2,
    PHASE_3_DELAY : 10,
};
const MOVE_SPEED_PHASE_1 = 2;
const MOVE_SPEED_PHASE_2 = 0.1;
const MOVE_SPEED_PHASE_3 = 0.1;
let moveSpeed = MOVE_SPEED_PHASE_1;

const Transform = function(x, y, w, h){
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.moveTo = function(dest, deltaTime){
        let keys = ["x", "y", "w", "h"];
        for(let k in keys){
            let key = keys[k];
            if(this[key] < dest[key]){
                this[key] += deltaTime * moveSpeed;
                if(this[key] > dest[key]) this[key] = dest[key];
            } else {
                this[key] -= deltaTime * moveSpeed;
                if(this[key] < dest[key]) this[key] = dest[key];
            }
        }
    };
    this.set = function(target){
        this.x = target.x;
        this.y = target.y;
        this.w = target.w;
        this.h = target.h;
    };
    this.compare = function(target){
        return (this.x == target.x &&
        this.y == target.y &&
        this.w == target.w &&
        this.h == target.h);
    };
}

const Image = function(img, x, y, w, h){
    this.image = img;

    this.destPos = new Transform(x,y,w,h);
    this.startPos = new Transform(0,0,1,1);
    this.currentPos = new Transform(0,0,0,0);
    this.currentPos.set(this.destPos);

    this.visible = false;
    this.alpha = 0;
    this.stage = 0;         //0 nothing, 1 entry, 2 display, 3 relocate
};
let imagePixels = [];

const init = function(){
    baseImg1 = document.getElementById("base1");
    baseImg2 = document.getElementById("base2");
    document.getElementById("startButton").onclick = StartButton;

    httpGetAsync("imageList", function(res){
        let photoDiv = document.getElementById("photos");
        photoDiv.innerHTML = res;
        images = photoDiv.getElementsByTagName("img");
        imgCount = res.split("src").length - 1;
        console.log(imgCount + " images")
        initCanvas();
    });
}
window.onload = init;



const GetImagePixelLocations = function(baseImg){
    const CUTOFF = 150;
    canvas.width = baseImg.width;
    canvas.height = baseImg.height;
    ctx.drawImage(baseImg,0,0,canvas.width,canvas.height);

    const totalPixels = canvas.width * canvas.height;
    let goodPixels = 0;

    for(let y = 0; y < canvas.height; ++y){
        for(let x = 0; x < canvas.width; ++x){
            let pixel = ctx.getImageData(x, y, 1, 1).data; 
            pixel = (pixel[0] + pixel[1] + pixel[2]) / 3;
            if (pixel > CUTOFF)
                ++goodPixels;
        }
    }

    let percentage = goodPixels / totalPixels;
    const imageCount = images.length;
    const totalNewPix = imageCount / percentage;

    const ratio = CANVAS_WIDTH / CANVAS_HEIGHT;
    const coeff = Math.sqrt(totalNewPix/ratio);
    const newPixColumns = Math.floor(coeff * ratio);
    const newPixRows = Math.floor(coeff);
    const newPixWidth = 1/newPixColumns;
    const newPixHeight = 1/newPixRows;

    let resultArray = [];

    for(let y = 0; y < newPixRows; ++y){
        for(let x = 0; x < newPixColumns; ++x){
            let pixel = ctx.getImageData(
                x/newPixColumns * canvas.width, 
                y/newPixRows * canvas.height,
                1, 1).data;
            pixel = (pixel[0] + pixel[1] + pixel[2]) / 3;

            if (pixel > CUTOFF)
                resultArray.push(new Transform(x * newPixWidth, y * newPixHeight, newPixWidth, newPixHeight));
        }
    }

    return resultArray;
}

const SetUpImagePixels = function(baseImg){
    let imgCounter = 0;
    let transformArray = GetImagePixelLocations(baseImg);
    for(let i in transformArray){
        let img = images[imgCounter];
        let t = transformArray[i];
        imgCounter = (imgCounter + 1) % images.length;
        let imgPx = new Image(img, t.x, t.y, t.w, t.h);
        imgPx.startPos = getImgFullscreenScale(img);
        imagePixels.push(imgPx);
    }

    console.log(imagePixels.length + " Image Pixels vs " + images.length + " input images");
    imagePixels = shuffle(imagePixels);
    console.log("image pixels shuffled");
};



const initCanvas = function(){
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    canvas2 = document.getElementById("canvas2");
    ctx2 = canvas2.getContext("2d");

    ctx.imageSmoothingEnabled = false;

    SetUpImagePixels(baseImg1);
    baseImg2TransformSet = shuffle(GetImagePixelLocations(baseImg2));

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    ctx.imageSmoothingEnabled = true;

    canvas2.width = CANVAS_WIDTH;
    canvas2.height = CANVAS_HEIGHT;
    ctx2.clearRect(0,0, canvas.width, canvas.height);
    ctx2.fillStyle="black";
    ctx2.fillRect(0, 0, canvas.width, canvas.height);

    update();
}

const update = () => {
    requestAnimationFrame(update);
    ctx.clearRect(0,0, canvas.width, canvas.height);
    ctx.fillStyle="black";
    ctx.globalAlpha = 1;
    // ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(canvas2, 0, 0, canvas.width, canvas.height);

    let currentTime = (new Date()).getTime();
    deltaTime = (currentTime - previousTime) / 1000;
    previousTime = currentTime;
    let fps = Math.round(1 / deltaTime);
    
    for(let i in imagePixels){

        if(started === true && imagePixels[i].visible === false)
            continue;

        if(started === true && imagePixels[i].currentPos.compare(imagePixels[i].destPos))
            continue;

        AnimateImage(imagePixels[i], deltaTime);

        let img = imagePixels[i];
        ctx.globalAlpha = (started) ? img.alpha : 1;
        let w = img.currentPos.w * canvas.width;
        let h = img.currentPos.h * canvas.height;
        let x = img.currentPos.x * canvas.width;
        let y = img.currentPos.y * canvas.height;
        ctx.drawImage(img.image,x,y,w,h);
    }

    ctx.font="12px Arial";
    ctx.fillStyle="white";
    ctx.fillText(fps,10,10);
};

const StartButton = function(){
    started = true;
    const skipSlideshow = false;
    if(skipSlideshow === false)
        ScheduleImages();
    else{
        for(let i in imagePixels){
            imagePixels[i].visible = true;
            imagePixels[i].alpha = 1;
            imagePixels[i].stage = 3;
        }
        Phase2();
    }    
};

const AnimateImage = function(imgPx, deltaTime){

    let percChange = deltaTime / TIME.IMG_ENTER;

    switch (imgPx.stage){
        case 1:
            imgPx.alpha += percChange;
            if(imgPx.alpha > 1) imgPx.alpha = 1;
            break;
        case 3:
            let before = imgPx.currentPos.compare(imgPx.destPos);
            imgPx.currentPos.moveTo(imgPx.destPos, deltaTime);
            let after = imgPx.currentPos.compare(imgPx.destPos);
            if(before === false && after == true)
                DrawToSecondCanvas(imgPx);
            break;
    }
};

const DrawToSecondCanvas = function(img){
    let w = img.currentPos.w * canvas.width;
    let h = img.currentPos.h * canvas.height;
    let x = img.currentPos.x * canvas.width;
    let y = img.currentPos.y * canvas.height;
    ctx2.drawImage(img.image,x,y,w,h);
};

const ScheduleImages = function(){
    let counter = 0;
    let loop;
    const totalTime = TIME.IMG_ENTER + TIME.IMG_DISPLAY + TIME.WAIT;
    loop = setInterval(function(){

        let img = imagePixels[counter];
        ++counter;

        img.visible = true;
        img.currentPos.set(img.startPos);
        ++img.stage;
        setTimeout(function(){
            ++img.stage;
            setTimeout(function(){
                ++img.stage;
            }, TIME.IMG_DISPLAY * 1000);
        }, TIME.IMG_ENTER * 1000);

        if(counter >= imagePixels.length){
            clearInterval(loop);
            setTimeout(Phase2, TIME.PHASE_2_DELAY * 1000);
        }

    }, totalTime * 1000);
};

const Phase2 = function(){

    moveSpeed = MOVE_SPEED_PHASE_2;

    ctx2.clearRect(0,0, canvas.width, canvas.height);
    ctx2.fillStyle="black";
    ctx2.fillRect(0, 0, canvas.width, canvas.height);

    for(let i in imagePixels){
        let img = imagePixels[i];
        let tr = baseImg2TransformSet[i % baseImg2TransformSet.length];
        img.destPos = tr;
    }

    setTimeout(Phase3, TIME.PHASE_3_DELAY * 1000);
};

const Phase3 = function(){

    moveSpeed = MOVE_SPEED_PHASE_3;

    ctx2.clearRect(0,0, canvas.width, canvas.height);
    ctx2.fillStyle="black";
    ctx2.fillRect(0, 0, canvas.width, canvas.height);

    for(let i in imagePixels){
        let img = imagePixels[i];
        let rX = (Math.random() - 0.5);
        rX += (rX > 0) ? 1 : -1;
        let rY = (Math.random() - 0.5);
        rY += (rY > 0) ? 1 : -1;
        let tr = new Transform(rX, rY, img.currentPos.w, img.currentPos.h);
        img.destPos = tr;
    }

};

// Switch to different image, then have everyone fly away

const shuffle = function(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}

const getImgFullscreenScale = function(img){
    let w = img.width;
    let h = img.height;
    let ratio = Math.max(w, h) / Math.min(w, h);
    let coeff = Math.min(w, h);
    let canvasRatio = Math.max(canvas.width, canvas.height) / Math.min(canvas.width, canvas.height);
    let canvasCoeff = Math.min(canvas.width, canvas.height);
    let finalWidth = 1;
    let finalHeight = 1;

    if(h > w){
        finalHeight = 1;
        // finalWidth = 
        // final width will be 50% of 150%, so math that out
    }

    let transform = new Transform(0,0,1,1);
    return transform;
};