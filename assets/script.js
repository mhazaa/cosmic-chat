//complex collision
//creator page
//tutorial exit button

//weird center on full screen
//clean code
//otherplayers lag

//back burner for now:
//over blend mode
//zoom out when flying
//keep falling if window not in focus
//monolith
////finish painting
//animations
//swing collisions
//if full dont break site
//check username again


let socket = io.connect(); //initialize socket io
let renderer;
let player;
let size = [1920, 1080];
//dom references
let dom = {
  introPage: document.getElementById('introPage'),
  loginForm: document.getElementById('login'),
  musicCheckbox: document.getElementById('musicCheckbox'),
  fullScreenCheckbox: document.getElementById('fullScreenCheckbox'),
  usernameEntry: document.getElementById('username'),
  usernameError: document.getElementById('usernameError'),
  hudTop: document.getElementById('hudTop'),
  hudBottom: document.getElementById('hudBottom'),
  chatForm: document.getElementById('chatForm'),
  chatMessage: document.getElementById('message'),
  currentRoom: document.getElementById('currentRoom'),
  otherRooms: document.getElementById('otherRooms'),
  aboutButton: document.getElementById('about'),
  aboutPage: document.getElementById('aboutPage'),
  aboutPageBackground: document.getElementById('aboutPageBackground'),
  audioIcon: document.getElementById('audioIcon')
}
//global variables
let globals = {
  ratio: size[0]/size[1],
  numOfPlayers: 50,
  state: null,
  otherPlayers: [],
  allComponents: [], //other than players
  collisionComponents: [],
  movableStages: null,
  fullWidth: null,
  keyPressed: {},
  loaderProgress: 0,
  loadingUpdate: null,
  idleNotice: null,
  mainFont: 'Arvo',
  secondaryFont: 'Poor Story',
}
let audio = {
  audioFile: new Audio('audio/song.mp3'),
  play: function(){
    this.audioFile.play();
  },
  pause: function(){
    this.audioFile.pause();
  },
  loopGapless: function(){
    this.audioFile.addEventListener('timeupdate', function(){
      var buffer = 10; //.44;
      if(this.currentTime > this.duration - buffer){
        this.currentTime = 0
        this.play()
      }}, false);
  }
}
audio.loopGapless();

let ticker = {
  lastUpdate: Date.now(),
  now: null,
  delta: null,
  update: function(){
    this.now = Date.now();
    this.delta = this.now-this.lastUpdate;
    this.lastUpdate = this.now;
  }
}
let stages = {
  mainStage: null,
  background: null,
  midgroundBack: null,
  midground: null,
  still: null,
  foreground: null,
  hud: null
}
let menuStages = {
  loadingScreen: null
}
let camera = {
  x: 0,
  y: 0,
  limitX: 0,
  limitY: 0
}
let imgURLS = [
  "imgs/background.jpg",
  "imgs/glowing_leaves.png",
  "imgs/hanger_island.png",
  "imgs/island1.json",
  "imgs/island2.json",
  "imgs/main_island.png",
  "imgs/midground_back.png",
  "imgs/mountain.png",
  "imgs/oranges.json",
  "imgs/overlay.png",
  "imgs/softlight.png",
  "imgs/startFloating.json",
  "imgs/tutorial.png",
  "imgs/upsideDown_island.png",
  //animations
  "imgs/animations/shrooms1.json",
  "imgs/animations/shrooms2.json",
  "imgs/animations/island1.json",
  "imgs/animations/swing.json"
]
//loader progress //once images load run playScreen function
PIXI.loader.add(imgURLS)
.on('progress', function loadProgressHandler(loader, resource){
  globals.loaderProgress = Math.round(loader.progress);
}).load(playSetup);
//main functions
let mainFunctions = {
  setupCanvas: function(){
    renderer = PIXI.autoDetectRenderer({
      width: size[0],
      height: size[1],
      antialias: false,
      transparent: true,
      resolution: 1,
      autoResize: true
    });
    document.body.appendChild(renderer.view);
  },
  setupStages: function(){
    //create all menu stages
    for(var key in menuStages){
      menuStages[key] = new PIXI.Container();
    }
    //create main stages
    stages.mainStage = new PIXI.Container();
    //create all other stages and add them to main stage
    for(var key in stages){
      if(key!='mainStage'){
        stages[key] = new PIXI.Container();
        stages.mainStage.addChild(stages[key]);
      }
    }
    //add movable stages to a global array
    globals.movableStages = [stages.foreground, stages.midground, stages.midgroundBack, stages.background];
    //set stages parrallax speed
    stages.foreground.z = 1.6;
    stages.midground.z = 1;
    stages.midgroundBack.z = 0.8;
    stages.background.z = 0.15;
  },
  keyboardInput: function(){
    document.addEventListener('keydown', function(e) {
      globals.keyPressed[e.keyCode] = true;
    }, false);
    document.addEventListener('keyup', function(e) {
      globals.keyPressed[e.keyCode] = false;
    }, false);
  },
  resizeFixed: function(){
    if (window.innerWidth / window.innerHeight >= globals.ratio) {
        var w = window.innerHeight * globals.ratio;
        var h = window.innerHeight;
    } else {
        var w = window.innerWidth;
        var h = window.innerWidth / globals.ratio;
    }
    renderer.view.style.width = w + 'px';
    renderer.view.style.height = h + 'px';
    //center stage on canvas
    renderer.view.style.position = 'absolute';
    renderer.view.style.left = '50%';
    renderer.view.style.top = '50%';
    renderer.view.style.transform = 'translate(-50%, -50%)';
    //center and resize dom HUD elements
    dom.hudTop.style.width = w + 'px';
    dom.hudBottom.style.width = w + 'px';
    dom.hudTop.style.top = renderer.view.getBoundingClientRect().top + 2 + 'px';
    dom.hudBottom.style.top = (renderer.view.getBoundingClientRect().height+renderer.view.getBoundingClientRect().top) - 5 + 'px';
  },
  resizeFullscreen: function(){
    stages.mainStage.scale.x = window.innerHeight/1080;
    stages.mainStage.scale.y = window.innerHeight/1080;
    menuStages.loadingScreen.scale.x = window.innerHeight/1080;
    menuStages.loadingScreen.scale.y = window.innerHeight/1080;
  }
}
mainFunctions.setupCanvas();
mainFunctions.setupStages();
mainFunctions.keyboardInput();
mainFunctions.resizeFixed();
window.onresize = mainFunctions.resizeFixed;
//helper devFunctions
let helperFunctions = {
  toggleFullScreen: function(){
    if ((document.fullScreenElement && document.fullScreenElement !== null) ||
     (!document.mozFullScreen && !document.webkitIsFullScreen)) {
      if (document.documentElement.requestFullScreen) {
        document.documentElement.requestFullScreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullScreen) {
        document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
      }
    } else {
      if (document.cancelFullScreen) {
        document.cancelFullScreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
      }
    }
  },
  clamp: function(num,min,max){
    if(num<min){
      num = min;
    } else if (num>max){
      num = max
    }
    return num;
  },
  center: function(){
    this.x = renderer.width/2 - this.width/2;
    this.y = renderer.height/2 - this.height/2;
  }
}
//extend pixi sprite
function extendPixiSprite(){
  PIXI.Sprite.prototype.play = function(){
    this.done = false;
    if(!this.done){
      if(this.tick){
        this.tick = false;
      } else {
        this.tick = true;
      }
      if(this.tick) this.frame++;
      this.frameTexture = this.fullTexture.textures[this.string+this.frame+'.png'];
      this.texture = this.frameTexture;
    }
    if(this.frame==this.numOfFrames){
      if(this.loop){
        this.frame = 0;
      } else {
        this.frame = this.numOfFrames-1;
        this.done = true;
      }
    }
  }
  PIXI.Sprite.prototype.reverse = function(){
    if(this.frame!=0){
      this.frame--;
      this.frameTexture = this.fullTexture.textures[this.string+this.frame+'.png'];
      this.texture = this.frameTexture;
    }
  }
  PIXI.Sprite.prototype.playNreverse = function(){
    if(!this.playingReverse) this.play();
    else this.reverse();
    if(this.done) this.playingReverse = true;
    if(this.frame==0) this.playingReverse = false;
  }
  PIXI.Sprite.prototype.animate = function(string, animation, loop){
    this.tick = true;
    this.frame = 0;
    this.done = false;
    this.numOfFrames = Object.keys(this.fullTexture.textures).length-1;
    this.playingReverse = false;
    this.string = string;
    if (typeof loop == 'undefined') loop = true;
    this.loop = loop;
    if (typeof animation == 'undefined') animation=this.play;
    this.animation = animation;
  }
}
extendPixiSprite();
//classes
class Message {
  constructor(message){
    this.message = message;
    this.timer = 0;
    var that = this;
    this.interval = setInterval(function(){
      that.timer++;
      if(that.timer>=3){
        that.message = '';
        clearInterval(that.interval);
      }
    },5000);
  }
}
class Text extends PIXI.Text {
  constructor(fontSize, fontFamily, fill, stage){
    super();
    if(stage) stage.addChild(this);
    this.text = '';
    this.style = {
      fontFamily : fontFamily,
      fontSize: fontSize,
      fill: fill,
      align: 'center'
    }
  }
}
class Rectangle extends PIXI.Graphics {
  constructor(x,y,w,h,color,stage){
    super();
    this.beginFill(color);
    this.drawRect(x, y, w, h);
    stage.addChild(this);
  }
}
class Button extends Rectangle {
  constructor(x,y,w,h,color,stage){
    super(x,y,w,h,color,stage);
    this.buttonMode = true;
    this.interactive = true;
    let that = this;
    this.on('mouseup', function(){
      that.whenClicked();
    });
  }
  whenClicked(){}
}
//pawn
class Pawn extends PIXI.Container {
  constructor(h){
    super();
    this.messages = [];
    for(var i=0; i<4; i++){
      this.messages.push(new Message(''));
    }
    this.initialX = renderer.width/2 - this.width/2;
    this.initialY = renderer.height/2 - this.height/2;
    this.position.set(this.initialX, this.initialY);
    //create sprite
    this.sprite = new PIXI.Sprite();
    this.sprite.fullTexture = PIXI.loader.resources['imgs/startFloating.json'];
    this.sprite.texture = this.sprite.fullTexture.textures['startFloating0.png'];
    var that = this;
    this.sprite.animate('startFloating', function(){
      if(that.vx != 0){
        this.playNreverse();
      } else {
        this.reverse();
      }
    }, false);
    this.sprite.anchor.x = 0.5;
    this.sprite.height = h;
    this.ratio = this.sprite.texture.height / this.sprite.texture.width;
    this.sprite.width = this.sprite.height / this.ratio;
    this.addChild(this.sprite);
    //text components
    this.text = new Text(17, globals.mainFont, 0xFFFFFF, this);
    this.text.style.wordWrap = true;
    this.text.style.wordWrapWidth = this.width*2;
    this.nameBox = new Rectangle(0,0,1,1,0xffee21,this);
    this.name = new Text(17, globals.mainFont, 0xca3800, this);
  }
  showMessages(){
    //place nameBox
    this.name.text = this.username.toUpperCase();
    this.name.x = -this.name.width/2;
    this.name.y = 20;
    this.nameBox.width = this.name.width+10;
    this.nameBox.height = this.name.height+4;
    this.nameBox.x = this.name.x-5;
    this.nameBox.y = this.name.y-2;
    //messages
    this.text.x = -this.text.width/2;
    this.text.y = this.name.y-this.text.height-5;
    this.text.text = this.messages[3].message + "\n" + this.messages[2].message +  "\n" + this.messages[1].message + "\n" + this.messages[0].message;
  }
  changeDirection(){
    if(this.direction==1 && this.sprite.scale.x>0){
      this.sprite.scale.x = -1;
      this.sprite.width = this.sprite.height / this.ratio;
    } else if(this.direction==0 && this.sprite.scale.x<0){
      this.sprite.scale.x = 1;
      this.sprite.width = this.sprite.height / this.ratio;
    }
  }
}
//player character
class PlayerCharacter extends Pawn {
  constructor(h,stage){
    super(h);
    stage.addChild(this);
    this.relationalX = 0;
    this.relationalY = 0;
    this.vx = 0;
    this.vy = 0;
    this.direction = 0;
    this.walkingSpeed = 0.12;
    this.flyingSpeed = 0.12;
    this.slow = 0.12;
    this.fast = 0.24;
    this.isFlying = false;
    this.isFalling = true;
    this.collisionBox = new Rectangle(-this.sprite.width/4,
    this.sprite.height/4.5,
    this.sprite.width/2,
    this.sprite.height/1.7,
    0xFFFF0,this);
    this.collisionBox.alpha = 0;
  }
  moving(){
    /*
    if(this.isFlying && stages.mainStage.scale.x>0.8){
      stages.mainStage.scale.x -= 0.001;
      stages.mainStage.scale.y -= 0.001;
    } else if (stages.mainStage.scale.x<1){
      stages.mainStage.scale.x += 0.01;
      stages.mainStage.scale.y += 0.01;
    }
    */
    //horizontal movememnt
    if(globals.keyPressed[39]){//right arrow
      this.vx = this.walkingSpeed;
      this.direction = 0;
    } else if(globals.keyPressed[37]){//left arrow
      this.vx = -this.walkingSpeed;
      this.direction = 1;
    } else {
      this.vx = 0;
    }
    //dropping
    if(globals.keyPressed[40]){
      this.isFalling = true;
    }
    //running
    if(globals.keyPressed[16]){//shift - run
      this.walkingSpeed = this.fast;
      //this.flyingSpeed = this.fast;
    } else {
      this.walkingSpeed = this.slow;
      //this.flyingSpeed = this.slow;
    }
    //flying controls
    if(globals.keyPressed[38]){
      this.isFlying = true;
    } else {
      this.isFlying = false;
    }
    //flying and falling
    if(this.isFlying){
      if(this.vy < this.flyingSpeed){
        this.vy += 0.01;
      }
    } else if (this.isFalling){
      if(this.vy > -this.flyingSpeed){
        this.vy -= 0.01;
      }
    } else {
      this.vy = 0;
    }
    //movememnt
    this.relationalX += this.vx * ticker.delta;
    camera.x = -helperFunctions.clamp(this.relationalX,0,camera.limitX);
    this.relationalY -= this.vy * ticker.delta;
    camera.y = -helperFunctions.clamp(this.relationalY,-camera.limitY, 0);
    //free x
    if(camera.x==0){
      this.x = this.initialX + this.relationalX;
    } else if (camera.x==-camera.limitX){
      this.x = this.initialX + (this.relationalX-globals.fullWidth+renderer.width);
    } else {
      this.x = this.initialX;
    }
    //free y
    if(camera.y==0){
      this.y = this.relationalY + this.initialY;
    } else if(camera.y==camera.limitY){
      this.y = this.initialY + (this.relationalY+camera.limitY);
    } else {
      this.y = this.initialY;
    }
    //capping y movements when it goes past the limit
    if(this.y<-this.height-100){
      this.relationalY = -camera.limitY-this.initialY-this.height-100;
    } else if (this.y>renderer.height+100){
      this.relationalY = renderer.height+100-this.initialY;
    }
    //flipping the stage
    if(this.x<-100){
      this.relationalX = globals.fullWidth-this.initialX;
    } else if (this.x>renderer.width+100){
      this.relationalX = 0 - this.initialX;
    }
    //move stages
    for(var i=0; i<globals.movableStages.length; i++){
      globals.movableStages[i].x = camera.x * globals.movableStages[i].z;
      globals.movableStages[i].y = camera.y * globals.movableStages[i].z;
    }
  }
  detectCollisions(){
    var inCollision = false;
    for(var i=0; i<globals.collisionComponents.length; i++){
      if(this.collisionBox.getBounds().y + this.collisionBox.height-(this.collisionBox.height/8) > globals.collisionComponents[i].getBounds().y
      && this.collisionBox.getBounds().y + this.collisionBox.height-(this.collisionBox.height/8) < globals.collisionComponents[i].getBounds().y + 15
      && this.collisionBox.getBounds().x + this.collisionBox.width > globals.collisionComponents[i].getBounds().x
      && this.collisionBox.getBounds().x < globals.collisionComponents[i].getBounds().x + globals.collisionComponents[i].width){
        inCollision = true;
      }
    }
    if(inCollision) this.isFalling=false;
    else this.isFalling=true;
  }
  updateServer(){
    socket.emit('update', {
      username: this.username,
      vx: this.vx,
      direction: this.direction,
      relationalX: this.relationalX,
      relationalY: this.relationalY,
      messages: this.messages
    });
  }
  update(){
    this.sprite.animation();
    this.changeDirection();
    this.showMessages();
    this.moving();
    this.detectCollisions();
  }
}
//other players
class OtherPlayer extends Pawn {
  constructor(h,stage){
    super(h);
    stage.addChild(this);
    globals.otherPlayers.push(this);
    globals.allComponents.push(this);
    this.visible = false;
  }
  update(){
    if(this.visible==true){
      this.x = this.relationalX + this.initialX;
      this.y = this.relationalY + this.initialY;
      this.sprite.animation();
      this.changeDirection();
      this.showMessages();
    }
  }
}
//actors
class Actor extends PIXI.Sprite {
  constructor(url,x,y,h,stage){
    super();
    stage.addChild(this);
    if(url.constructor === Array){
      this.fullTexture = PIXI.loader.resources[url[0]];
      this.texture = this.fullTexture.textures[url[1]];
    } else {
      this.texture = PIXI.loader.resources[url].texture;
    }
    this.height = h;
    this.ratio = this.texture.height / this.texture.width;
    this.width = this.height / this.ratio;
    this.x = x;
    this.y = renderer.height - this.height - y; //calculate from bottom
    globals.allComponents.push(this);
  }
  update(){
    if(this.animation) this.animation();
  }
}
//tutorial
class Tutorial extends Actor {
  constructor(url, h){
    super(url,0,0,h,stages.hud);
    var that = this;
    this.x = renderer.width/2 - this.width/2;
    this.y = renderer.height/2 - this.height/2;
    //exit button
    this.exitTutorial = new Button(0, 0, 60, 60, 0xff8916, stages.hud);
    this.exitTutorial.alpha = 0;
    this.exitTutorial.whenClicked = function(){
      that.visible = false;
      this.visible = false;
    }
    this.exitTutorial.x = this.x+30;
    this.exitTutorial.y = this.y+35;
    //toggle tutorial with exit key
    document.addEventListener('keyup', function(e) {
      if(e.keyCode==27){
        if(that.visible){
          that.visible = false;
          that.exitTutorial.visible = false;
        } else {
          that.visible = true;
          that.exitTutorial.visible = true;
        }
      }
    }, false)
  }
}
//collision box
class CollisionBox extends Rectangle {
  constructor(x,y,w){
    super(x,0,w,30,0xFFFF00,stages.midground);
    this.y = renderer.height - this.height - y;
    this.alpha = 0;
    globals.collisionComponents.push(this);
  }
}
class CollisionLine {
  constructor(x1,y1,x2,y2){
    this.x1 = x1;
    this.x2 = x2;
    this.y1 = renderer.height - y1;
    this.y2 = renderer.height - y2;
    this.main = new Rectangle(this.x1,this.y1,this.x2-this.x1,this.y2-this.y1,0xFFFF00,stages.midground);
    if(this.y2>this.y1){
      this.slope = 'down';
    } else {
      this.slope = 'up';
    }
    this.line = new PIXI.Graphics();
    this.line.lineStyle(2, 0xffffff);
    this.line.moveTo(this.x1, this.y1);
    this.line.lineTo(this.x2, this.y2);
    this.line.endFill();
    stages.midground.addChild(this.line);
    globals.allComponents.push(this);
    this.main.alpha = 0;
    this.line.alpha = 0;
  }
  intersect(x1, y1, x2, y2, x3, y3, x4, y4){
    // Check if none of the lines are of length 0
    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
      return false
    }
    var denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))
    // Lines are parallel
    if (denominator === 0) {
      return false
    }
    let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
    let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator
    // is the intersection along the segments
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
      return false
    }
    // Return a object with the x and y coordinates of the intersection
    let x = x1 + ua * (x2 - x1)
    let y = y1 + ua * (y2 - y1)
    return {x, y}
  }
  lineCollision(){
    var intersection = false;

    if(this.slope=='down'){
      intersection = this.intersect(player.collisionBox.getBounds().x,
        player.collisionBox.getBounds().y,
        player.collisionBox.getBounds().x,
        player.collisionBox.getBounds().y+player.collisionBox.height,
        this.line.getBounds().x,
        this.line.getBounds().y,
        this.line.getBounds().x+ this.x2-this.x1,
        this.line.getBounds().y+ this.y2-this.y1
      )
    }
    else {
      intersection = this.intersect(player.collisionBox.getBounds().x+player.collisionBox.width,
        player.collisionBox.getBounds().y,
        player.collisionBox.getBounds().x+player.collisionBox.width,
        player.collisionBox.getBounds().y+player.collisionBox.height,
        this.line.getBounds().x,
        this.line.getBounds().y + (this.y1-this.y2),
        this.line.getBounds().x + (this.x2-this.x1),
        this.line.getBounds().y
      )
    }

    if(intersection){
      var a = (player.collisionBox.getBounds().y+player.collisionBox.height)-intersection.y;
      if(a>0 && a<10){
        player.isFalling = false;
        player.relationalY-= a;
      } else {
        player.isFalling = true;
      }
    } else {
      player.isFalling = true;
    }
  }
  update(){
    //detect collision
    var playerCollision = player.collisionBox;
    if (playerCollision.getBounds().x < this.main.getBounds().x + this.main.width &&
    playerCollision.getBounds().x + playerCollision.width > this.main.getBounds().x &&
    playerCollision.getBounds().y < this.main.getBounds().y + this.main.height &&
    playerCollision.getBounds().y + playerCollision.height > this.main.getBounds().y) {
      this.lineCollision();
    }
  }
}
//play setup [loaded once images are finsihed loading];
function playSetup(){
  //main player sprite
  player = new PlayerCharacter(216, stages.still);
  //hud
  globals.idleNotice = new Text(20, globals.mainFont, 0xFFFFFF, stages.hud);
  globals.idleNotice.text = "You were idle for too long\n Just start moving again to join back";
  helperFunctions.center.apply(globals.idleNotice);
  globals.idleNotice.visible = false;
  let tutorial = new Tutorial('imgs/tutorial.png', 400);
  //actors
  let background = new Actor('imgs/background.jpg', 0, 0, 2160, stages.background);
  //midground back
  let midgroundBack = new Actor('imgs/midground_back.png', 0, 0, 540, stages.midgroundBack);
  //midground
  let mountain = new Actor('imgs/mountain.png', 0, 0, 1328, stages.midground);
  let firstIsland = new Actor(['imgs/island1.json','first_island.png'], 170, 1080-350-292, 350, stages.midground);
  let upsideDownIsland = new Actor('imgs/upsideDown_island.png', 2916, 1080-1296+2600, 864, stages.midground);
  let shrooms1 = new Actor(['imgs/animations/shrooms1.json','shrooms1_0.png'], 0, 1080-259-626, 259, stages.midground);
  shrooms1.animate('shrooms1_');
  let shrooms2 = new Actor(['imgs/animations/shrooms2.json','shrooms2_0.png'], 615, 1080-270-496, 270, stages.midground);
  shrooms2.animate('shrooms2_');
  let firstIslandTrees = new Actor(['imgs/animations/island1.json','island1_0.png'], 60, 1080-520+138, 520, stages.midground);
  firstIslandTrees.animate('island1_');
  let bigIsland = new Actor(['imgs/island1.json','big_island.png'], 1134, 1080-864+378,  864, stages.midground);
  let smallIsland = new Actor(['imgs/island2.json','small_island.png'], 600, 1080-756+600, 756, stages.midground);
  let swing = new Actor(['imgs/animations/swing.json','swing_0.png'], 2862, 1080-648+1620, 648, stages.midground);
  swing.animate('swing_');
  let highestIsland = new Actor(['imgs/island2.json','highest_island.png'], 216, 1080-1296+1890, 1296, stages.midground);
  let glowingLeaves = new Actor('imgs/glowing_leaves.png', 486, 1080-540+432, 540, stages.midground);
  let branch1 = new Actor(['imgs/oranges.json','branch_island1.png'], 594, 1080-432+86, 432, stages.midground);
  let branch2 = new Actor(['imgs/oranges.json','branch_island2.png'], 1350, 1080-864-32, 864, stages.midground);
  let branch3 = new Actor(['imgs/oranges.json','branch_mountain1.png'], 216, 1080-108-864, 108, stages.midground);
  let branch4 = new Actor(['imgs/oranges.json','branch_mountain2.png'], 810, 1080-140-691, 140, stages.midground);
  let mainIsland = new Actor('imgs/main_island.png', 2376, 1080-972+648, 972, stages.midground);
  let bridge = new Actor(['imgs/oranges.json','bridge.png'], 3942, 1080-183+367, 183, stages.midground);
  let hangerIsland = new Actor('imgs/hanger_island.png', 4212, 1080-972+1188, 972, stages.midground);

  //collisions
  new CollisionBox(179,723,457);
  new CollisionLine(231,133,396,184);
  new CollisionLine(396,184,499,184);
  new CollisionLine(815,326,928,336);
  new CollisionLine(928,336,1053,340);
  new CollisionLine(1053,340,1158,283);
  new CollisionLine(1358,196,1479,303);
  new CollisionLine(1479,303,1637,518);
  new CollisionLine(1637,518,1885,628);
  new CollisionLine(1885,628,2073.4,644);
  new CollisionLine(2073,644,2448,982);
  new CollisionLine(2448,982,2676,1019);
  new CollisionLine(2676,1019,2799,935);
  new CollisionLine(1664,452,1734,422);
  new CollisionLine(1734,422,2054,131);
  new CollisionBox(2022,120,1052);
  new CollisionLine(2900,140,3212,75);
  new CollisionLine(3212,75,3702,142);
  new CollisionLine(3702,142,4151,486);
  new CollisionLine(4151,486,4537,557);
  new CollisionLine(4537,557,4822,451);
  new CollisionLine(4822,451,5368,93);
  new CollisionBox(5368,93,526);

  new CollisionBox(732,1367,231);
  new CollisionBox(1194,1119,754);
  new CollisionBox(338,2604,553);
  new CollisionBox(2530,1253,1440);
  new CollisionBox(3975,1299,1127);
  new CollisionBox(4430,1849,746);

  //collision boxes
  /*
  let branch = new CollisionBox(324, 184, 162);
  let branchh = new CollisionBox(216, 162, 108);
  let branchTwo = new CollisionBox(918, 357, 162);
  let branchTwoo = new CollisionBox(810,324,324);
  let branchThree = new CollisionBox(702,831.6,831.6);
  let branchFour = new CollisionBox(1836,702,702);
  let island1collision = new CollisionBox(356.4,756,756);
  let island2collision = new CollisionBox(1188,1134,1134);
  let highestCollision = new CollisionBox(432,2559.6,2559.6);
  let smallIslandCollision = new CollisionBox(2073.6,1706.4,1706.4);
  let bigIslandCollision = new CollisionBox(2548.8,1296,1296);
  let bridgeCollision = new CollisionBox(3963.6,1328.4,1328.4);
  let hangerIslandCollision = new CollisionBox(4428,1879.2,1879.2);
  let ground = new CollisionBox(2052,108,108);
  let ground2 = new CollisionBox(5400,54,54);
  let hillCollision = new CollisionBox(4212,540,540);
  let hillCollision2 = new CollisionBox(4752,324,324);
  let hillCollision3 = new CollisionBox(4968,270,270);
  */

  //other players
  for(var i=0; i<globals.numOfPlayers; i++){
    let otherPlayer = new OtherPlayer(216, stages.midground);
  }
  //foreground
  let grass1 = new Actor(['imgs/oranges.json','grass1.png'], 0, 1080-216-864, 216, stages.foreground);
  let grass2 = new Actor(['imgs/oranges.json','grass2.png'], 3240, 1080-216-864, 216, stages.foreground);
  //postprocessing
  let softlight = new Actor('imgs/softlight.png', 0, 0, 1080, stages.still);
  softlight.blendMode = PIXI.BLEND_MODES.ADD;
  softlight.alpha = 0.4;
  let overlay = new Actor('imgs/overlay.png', 0, 0, 2160, stages.midground);
  overlay.blendMode = PIXI.BLEND_MODES.ADD;
  overlay.alpha = 0.4;
  let overlay2 = new Actor('imgs/overlay.png', 0, 1080-2376+1296, 2376, stages.still);
  overlay2.blendMode = PIXI.BLEND_MODES.ADD;
  overlay2.alpha = 0.2;
  globals.allComponents.push(overlay2);
  overlay2.update = function(){
    this.rotation += 0.0002;
    this.scale.x += 0.0002;
    this.scale.y += 0.0002;
  }
  //overlay.pluginName = 'picture';
  //overlay.blendMode = PIXI.BLEND_MODES.OVERLAY;

  //get the full width of the game and decide world limits based off that
  globals.fullWidth = mountain.width;
  camera.limitX = globals.fullWidth - renderer.width;
  camera.limitY = (background.height/stages.background.z)/2;
  renderer.render(stages.mainStage);
}
//loading setup [loaded instantly]
function loadingSetup(){
  let fill = new Rectangle(0,0,600,3,0x323232,menuStages.loadingScreen);
  helperFunctions.center.apply(fill);
  let loading = new Rectangle(0,0,600,3,0xffee21,menuStages.loadingScreen);
  helperFunctions.center.apply(loading);
  let loadingText = new Text(60, globals.secondaryFont, 0xffee21,menuStages.loadingScreen);
  helperFunctions.center.apply(loadingText);
  loadingText.y -= 40;

  globals.loadingUpdate = function(){
    loadingText.text = globals.loaderProgress + ' %';
    loadingText.x = renderer.width/2 - loadingText.width/2;
    loading.width = globals.loaderProgress*6;
    if(globals.loaderProgress>=99.5){
      stages.hud.visible = false;
      dom.introPage.style.display = 'block';
      globals.state = states.intro;
      stages.mainStage.alpha = 0.7;
    }
  }
}
loadingSetup();
//states
let states = {
  play: function(){
    player.update();
    for(var i=0; i<globals.allComponents.length; i++){
      globals.allComponents[i].update();
    }
    renderer.render(stages.mainStage);
  },
  loading: function(){
    globals.loadingUpdate();
    renderer.render(menuStages.loadingScreen);
  },
  intro: function(){
    renderer.render(stages.mainStage);
  }
}
//gameloop and state
//var stats = new Stats();
//stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
//document.body.appendChild(stats.dom);
function gameLoop(){
  //stats.begin();
  ticker.update();
  globals.state();
  //stats.end();
  window.requestAnimationFrame(gameLoop);
}
//start game on intro screen
globals.state = states.loading;
window.requestAnimationFrame(gameLoop);
//dom hud elements
let domHUD = function(){
  //open the about page
  dom.aboutButton.addEventListener('click', function(){
    dom.aboutPage.style.display = 'block';
  });
  //hide the about page
  dom.aboutPageBackground.addEventListener('click', function(){
    dom.aboutPage.style.display = 'none';
  })
  //send text
  dom.chatForm.addEventListener('submit', function(e){
    e.preventDefault();
    if(dom.chatMessage.value != ''){
      player.messages.unshift(new Message(dom.chatMessage.value));
      dom.chatMessage.value = '';
      if(player.messages.length>4){
        player.messages.splice(-1,1)
      }
    }
  });
  //audio control
  dom.audioIcon.addEventListener('click', function(){
    if(this.style.opacity==0.7){
      this.style.opacity=0.4;
      audio.pause();
    } else {
      this.style.opacity=0.7;
      audio.play();
    }
  });
}
domHUD();
//recieve otherPlayers object from server
let websocketEvents = function(){
  socket.on('updateOtherPlayers', function(data){
    dom.currentRoom.innerHTML = 'room' + data.room + ' : ' + (Object.keys(data.otherPlayers).length+1) + '/' + globals.numOfPlayers;
    var existingPlayers = [];
    for(var key in data.otherPlayers){
      var a = data.otherPlayers[key];
      existingPlayers.push(Number(key));
      globals.otherPlayers[key].visible = true;
      globals.otherPlayers[key].username = a.username;
      globals.otherPlayers[key].direction = a.direction;
      globals.otherPlayers[key].vx = a.vx;
      globals.otherPlayers[key].relationalX = a.relationalX;
      globals.otherPlayers[key].relationalY = a.relationalY;
      globals.otherPlayers[key].messages = a.messages;
    }
    for(var i=0; i<globals.otherPlayers.length; i++){
      var a = true;
      for(var x=0; x<existingPlayers.length; x++){
        if(i == existingPlayers[x]){
          a = false;
        }
      }
      if(a) globals.otherPlayers[i].visible = false;
    }
  });
  socket.on('disconnect', function(){
    for(var i=0; i<globals.otherPlayers.length; i++){
      globals.otherPlayers[i].visible = false;
    }
  });
  var cascaded = false;
  var int;
  dom.currentRoom.addEventListener('click', function(){
    if(cascaded){
        dom.otherRooms.innerHTML = '';
        clearInterval(int);
        cascaded = false;
    }
    else {
      socket.emit('fetchRoomsInfo');
      int = setInterval(function(){
        socket.emit('fetchRoomsInfo');
      },500);
      cascaded = true;
    }
  });
  socket.on('roomsInfo', function(data){
    dom.otherRooms.innerHTML = '';
    for(var key in data){
      var room = document.createElement('p');
      room.innerHTML = 'room' + key + ' : ' + data[key] + '/' + globals.numOfPlayers;
      room.classList.add('room');
      room.id = key;
      dom.otherRooms.prepend(room);
    }
    var roomButtons = dom.otherRooms.getElementsByTagName('p');
    for(var i=0; i<roomButtons.length; i++){
      (function(i){
        roomButtons[i].addEventListener('click', function(){
          socket.emit('switchRoom', Number(roomButtons[i].id));
          player.updateServer();
          dom.otherRooms.innerHTML = '';
          clearInterval(int);
          cascaded = false;
        });
      })(i);
    }
  });
  setInterval(function(){
    if(player.vx!=0 || player.vy!=0 || player.messages[0].message!=''){
      player.once = true;
      player.updateServer();
    } else if(player.vx==0 && player.once){
      player.once = false;
      player.updateServer();
    }
  },1000/30);
  socket.on('idle', function(){
    stages.still.alpha = 0.7;
    stages.background.alpha = 0.7;
    stages.midground.alpha = 0.7;
    stages.midgroundBack.alpha = 0.7;
    stages.foreground.alpha = 0.7;
    globals.idleNotice.visible = true;
  });
  socket.on('wakeup', function(){
    stages.still.alpha = 1;
    stages.background.alpha = 1;
    stages.midground.alpha = 1;
    stages.midgroundBack.alpha = 1;
    stages.foreground.alpha = 1;
    globals.idleNotice.visible = false;
  });
}
//checking is username is available on hover
dom.usernameEntry.addEventListener('input', function(){
  socket.emit('checkUsername', this.value);
});
socket.on('isUsernameTaken', function(data){
  if(data==true){
    dom.usernameError.innerHTML = "*Username already taken. Choose a different one.*";
    dom.usernameError.style.visibility = 'visible';
  } else {
    dom.usernameError.style.visibility = 'hidden';
  }
});
//logging into game
dom.loginForm.addEventListener('submit', function(e){
  e.preventDefault();
  if(dom.usernameError.style.visibility=='hidden' && dom.usernameEntry.value != ''){
    if(dom.musicCheckbox.checked){
      dom.audioIcon.style.opacity = 0.7;
      audio.play();
    }
    if(dom.fullScreenCheckbox.checked){
      helperFunctions.toggleFullScreen();
    }
    socket.emit('startGame');
  } else if (dom.usernameEntry.value == ''){
    dom.usernameError.innerHTML = "Username can't be empty, dumbo";
    dom.usernameError.style.visibility = 'visible';
  }
});
//start game
socket.on('startGame', function(data){
  stages.mainStage.alpha = 1;
  stages.hud.visible = true;
  player.username = dom.usernameEntry.value;
  globals.state = states.play;
  dom.introPage.style.display = 'none';
  dom.hudTop.style.display = 'block';
  dom.hudBottom.style.display = 'block';
  websocketEvents();
});

//development functions (not used)
let devFunctions = {
  checkRendererType: function checkRendererType(){
    //console.log(PIXI.utils.isWebGLSupported());//webgl supported
    console.log(renderer.type); //1 is webgl //2 is canver
    if(renderer instanceof PIXI.CanvasRenderer) {
      console.log('canvas')}
    else {
      console.log('webgl')
    }
  }
}

let devEngine = {
  class: null,
  controls: function(){
    var that = this;
    //Q = boxCollision //W = lineCollision //ENTER = submit
    document.addEventListener('keyup', function(e){
      switch(e.keyCode){
        case 81: //Q
        that.class ='box';
        break;
        case 87: //W
        that.class ='line';
        break;
        case 13: //enter
        that.sendToServer();
        that.build();
        that.resetData();
      }
      console.log(that.class);
    });
  },
  clickN: 1,
  resetData: function(){
    this.clickN = 1;
    this.data = {
      "collisionLineX": [],
      "collisionLineY": [],
      "collisionBox": []
    }
  },
  run: function(){
    this.controls();
    this.resetData();
    var that = this;
    window.addEventListener('click', function(ev){
      if (ev == null) { ev = window.event }
      var x = ev.clientX - camera.x;
      var y = (window.innerHeight-ev.clientY)+camera.y;

      if(that.class=='line'){
        that.data.collisionLineX.push(x);
        that.data.collisionLineY.push(y);
      }

      if(that.class=='box'){
        if(that.clickN==1){
          that.data.collisionBox.push({
            "x": x,
            "y": y
          });
          that.clickN = 2;
        } else if(that.clickN==2){
          var last = that.data.collisionBox[that.data.collisionBox.length-1];
          last.w = x-last.x;
          that.clickN = 1;
        }
      }
      console.log(that.data);
    });
  },
  build: function(){
    for(var i=1; i<this.data.collisionLineX.length; i++){
      new CollisionLine(this.data.collisionLineX[i-1], this.data.collisionLineY[i-1], this.data.collisionLineX[i], this.data.collisionLineY[i]);
    }
    for(var i=0; i<this.data.collisionBox.length; i++){
      new CollisionBox(this.data.collisionBox[i].x, this.data.collisionBox[i].y, this.data.collisionBox[i].w);
    }
  },
  sendToServer: function(){
    if(this.class=='line'){
      this.ajax('/line', {
        "x": this.data.collisionLineX,
        "y": this.data.collisionLineY
      });
    } else if(this.class=='box'){
      this.ajax('/box',{"collisionBox":this.data.collisionBox});
    }
  },
  ajax: function(command, data){
    var xhr = new XMLHttpRequest();
    xhr.open('POST', command, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    var params = "data="+JSON.stringify(data);
    xhr.onreadystatechange = function() {
      if(this.readyState == 4 && this.status == 200) {
        console.log(this.responseText);
      }
    }
    xhr.send(params);
  }
}
//devEngine.run();


//let island2 = new Actor("imgs/both islands.png", 1.05, -0.35, 0.8, stages.midground);
//island2.cropTexture(0,0,800,0);

/*
cropTexture(x,y,w,h){
  if (w==0) w=this.texture.width;
  if (h==0) h=this.texture.height;
  this.croppedTexture = this.texture;
  this.croppedTexture.frame = new PIXI.Rectangle(x, y, w, h);
  this.texture = this.croppedTexture;
}
*/
