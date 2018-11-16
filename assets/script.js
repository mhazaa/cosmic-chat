//idle
//creator page
//complex collision
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
//dom references
let dom = {
  introPage: document.getElementById('introPage'),
  loginForm: document.getElementById('login'),
  musicCheckbox: document.getElementById('musicCheckbox'),
  fullScreenCheckbox: document.getElementById('fullScreenCheckbox'),
  usernameEntry: document.getElementById('username'),
  usernameError: document.getElementById('usernameError'),
  hud: document.getElementById('hud'),
  chatForm: document.getElementById('chatForm'),
  chatMessage: document.getElementById('message'),
  currentRoom: document.getElementById('currentRoom'),
  otherRooms: document.getElementById('otherRooms'),
  aboutButton: document.getElementById('about'),
  aboutPage: document.getElementById('aboutPage')
}
//global variables
let globals = {
  size: [1920, 1080],
  ratio: 1920 / 1080,
  numOfPlayers: 50,
  state: null,
  otherPlayers: [],
  allComponents: [], //other than players
  collisionComponents: [],
  movableStages: null,
  fullWidth: null,
  fullHeight: null,
  keyPressed: {},
  loaderProgress: 0,
  loadingUpdate: null,
  mainFont: 'Arvo',
  secondaryFont: 'Poor Story',
  music: new Audio('audio/song.mp3'),
  playMusic: function(){
    globals.music.loop = true;
    globals.music.play();
  }
}
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
  loadingScreen: null,
  intro: null,
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
  "imgs/floating.json",
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
      width: globals.size[0],
      height: globals.size[1],
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
  resize: function(){
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
  }
}
mainFunctions.setupCanvas();
mainFunctions.setupStages();
mainFunctions.keyboardInput();
mainFunctions.resize();
window.onresize = mainFunctions.resize;
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
  },
  // line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
  // Determine the intersection point of two line segments
  // Return FALSE if the lines don't intersect
  intersect: function(x1, y1, x2, y2, x3, y3, x4, y4){
    // Check if none of the lines are of length 0
    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
      return false
    }
    denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))
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
}
//extend pixi sprite
PIXI.Sprite.prototype.positionAndSize = function(x,y,h){
  this.position.set(renderer.height*x, renderer.height*y)
  this.height = renderer.height * h;
  this.ratio = this.texture.height / this.texture.width;
  this.width = this.height / this.ratio;
}
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
//animation
class Animation {
  constructor(fullTexture, string){
    this.frame = 0;
    this.done = false;
    this.fullTexture = fullTexture;
    this.numOfFrames = Object.keys(this.fullTexture.textures).length-1;
    this.string = string;
  }
  play(a, loop){
    this.a = a;
    this.done = false;
    if(!this.done){
      this.frame++;
      this.frameTexture = this.fullTexture.textures[this.string+this.frame+'.png'];
      this.a.texture = this.frameTexture;
    }
    if(this.frame==this.numOfFrames){
      if(loop){
        this.frame = 0;
      } else {
        this.frame = this.numOfFrames-1;
        this.done = true;
      }
    }
  }
  reverse(){
    if(this.frame!=0){
      this.frame--;
      this.frameTexture = this.fullTexture.textures[this.string+this.frame+'.png'];
      this.a.texture = this.frameTexture;
    }
  }
}
//pawn
class Pawn extends PIXI.Container {
  constructor(h){
    super();
    this.messages = [];
    for(var i=0; i<4; i++){
      this.messages.push(new Message(''));
    }
    this.startFloatingTexture = PIXI.loader.resources['imgs/startFloating.json'];
    this.floatingTexture = PIXI.loader.resources['imgs/floating.json'];
    this.floatingAnimation = new Animation(this.floatingTexture, 'floating');
    this.startFloatingAnimation = new Animation(this.startFloatingTexture, 'startFloating');
    this.initialX = renderer.width/2 - this.width/2;
    this.initialY = renderer.height/2 - this.height/2;
    this.position.set(this.initialX, this.initialY);
    //create sprite
    this.sprite = new PIXI.Sprite(this.startFloatingTexture.textures['startFloating0.png']);
    this.sprite.anchor.x = 0.5;
    this.sprite.height = renderer.height * h;
    this.ratio = this.sprite.texture.height / this.sprite.texture.width;
    this.sprite.width = this.sprite.height / this.ratio;
    this.addChild(this.sprite);

    this.text = new Text(17, globals.mainFont, 0xFFFFFF, this);
    this.text.style.wordWrap = true;
    this.text.style.wordWrapWidth = this.width*2;
    this.nameBox = new Rectangle(0,0,1,1,0xffee21,this);
    this.name = new Text(17, globals.mainFont, 0xca3800, this);

    this.a = 0;
  }
  showMessage(){
    this.text.x = -this.text.width/2;
    this.text.y = this.name.y-this.text.height-5;
    this.name.text = this.username.toUpperCase();
    this.name.x = -this.name.width/2;
    this.name.y = 20;
    this.nameBox.width = this.name.width+10;
    this.nameBox.height = this.name.height+4;
    this.nameBox.x = this.name.x-5;
    this.nameBox.y = this.name.y-2;
    this.text.text = this.messages[3].message + "\n" + this.messages[2].message +  "\n" + this.messages[1].message + "\n" + this.messages[0].message;
  }
  /*
  animationUpdate(){
    if(this.vx != 0){
      this.startFloatingAnimation.play(this.sprite, false);
      if(this.startFloatingAnimation.done){
        this.floatingAnimation.play(this.sprite, true);
      }
    } else {
      if(this.startFloatingAnimation.done){
        if(this.floatingAnimation.frame==0){
          this.startFloatingAnimation.reverse();
        } else {
          this.floatingAnimation.reverse();
        }
      } else {
        this.startFloatingAnimation.reverse();
      }
    }
  }
  */
  animationUpdate(){
    if(this.vx != 0){
      if(this.a==0) this.startFloatingAnimation.play(this.sprite, false);
      else this.startFloatingAnimation.reverse();

      if(this.startFloatingAnimation.done) this.a = 1;
      if (this.startFloatingAnimation.frame == 0) this.a = 0;
    } else {
      this.startFloatingAnimation.reverse();
    }
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
    this.collisionBox = new Rectangle(-this.sprite.width/4, 0, this.sprite.width/2, this.sprite.height,0xFFFF0,this);
    this.collisionBox.alpha = 0;
  }
  moving(){
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
    /*
    var coll = helperFunctions.intersect(this.x,
      this.y+this.height,
      this.x+this.width,
      this.y+this.height,
      line.getBounds().x+line.currentPath.points[0],
      line.getBounds().y+line.currentPath.points[1],
      line.getBounds().x+line.currentPath.points[2],
      line.getBounds().y+line.currentPath.points[3]
    )
    */

    //console.log(line.getBounds().y+coll.y);
    //console.log(this.y+this.height);

    /*
    if(this.relationalY != -(line.getBounds().y+coll.y-this.initialY-this.height) ){
      this.isFalling = true;
    }

    if(coll){
      if(!this.isFlying && this.isFalling==true){
        this.relationalY = -(line.getBounds().y+coll.y-this.initialY-this.height);
        this.isFalling = false;
      }
    } else {
      this.isFalling = false
    }
    */


    for(var i=0; i<globals.collisionComponents.length; i++){
      if(globals.collisionComponents[i].inCollision==true){
        this.isFalling = false;
        break;
      } else {
        this.isFalling = true;
      }
    }
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
    this.animationUpdate();
    this.changeDirection();
    this.showMessage();
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
      this.animationUpdate();
      this.changeDirection();
      this.showMessage();
    }
  }
}
//actors
class Actor extends PIXI.Sprite {
  constructor(url,x,y,h,stage,animated){
    super();
    stage.addChild(this);
    if(typeof animated == "undefined") animated=false;
    if(url.constructor === Array){
      this.fullTexture = PIXI.loader.resources[url[0]];
      if(animated){
        this.texture = this.fullTexture.textures[url[1]+'0.png'];
        this.animation = new Animation(this.fullTexture, url[1]);
      } else {
        this.texture = this.fullTexture.textures[url[1]];
      }
    } else {
      this.texture = PIXI.loader.resources[url].texture;
    }
    this.positionAndSize(x,y,h);
    globals.allComponents.push(this);
  }
  cropTexture(x,y,w,h){
    if (w==0) w=this.texture.width;
    if (h==0) h=this.texture.height;
    this.croppedTexture = this.texture;
    this.croppedTexture.frame = new PIXI.Rectangle(x, y, w, h);
    this.texture = this.croppedTexture;
  }
  update(){
    if(this.animation){
      this.animation.play(this, true);
    }
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
    this.exitTutorial = new Button(0, 0, 70, 70, 0xff8916, stages.hud);
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
class CollisionBox extends PIXI.Graphics {
  constructor(x,y,w,h){
    super();
    stages.midground.addChild(this);
    this.beginFill(0xFFFF00);
    this.drawRect(renderer.height*x, renderer.height*y, renderer.height*w, renderer.height*h);
    this.visible = false;
    this.alpha = 0.6;
    this.inCollision = false;
    globals.collisionComponents.push(this);
    globals.allComponents.push(this);
  }
  update(){
    //detect collision
    var playerCollision = player.collisionBox;
    if(playerCollision.getBounds().y + playerCollision.height-(playerCollision.height/8) > this.getBounds().y
    && playerCollision.getBounds().y + playerCollision.height-(playerCollision.height/8) < this.getBounds().y + 15
    && playerCollision.getBounds().x + playerCollision.width > this.getBounds().x
    && playerCollision.getBounds().x < this.getBounds().x + this.width){
      this.inCollision = true;
    } else {
      this.inCollision = false;
    }
  }
}
let line;
//play setup [loaded once images are finsihed loading];
function playSetup(){
  //main player sprite
  player = new PlayerCharacter(0.2, stages.still);
  /*
  line = new PIXI.Graphics();
  line.lineStyle(5, 0xffffff);
  line.moveTo(0, 0);
  line.lineTo(700, 700);
  line.endFill();
  stages.midground.addChild(line);
  */

  //tutorial
  let tutorial = new Tutorial('imgs/tutorial.png', 0.4);
  //actors
  let background = new Actor('imgs/background.jpg', 0, -1, 2, stages.background);
  let midgroundBack = new Actor('imgs/midground_back.png', 0, 0.5, 0.5, stages.midgroundBack);
  let mountain = new Actor('imgs/mountain.png', 0, -0.23, 1.23, stages.midground);
  let firstIsland = new Actor(['imgs/island1.json','first_island.png'], 0.3, 0.27, 0.25, stages.midground);
  let upsideDown = new Actor('imgs/upsideDown_island.png', 2.7, -2, 0.8, stages.midground);
  //animations
  let shrooms1 = new Actor(['imgs/animations/shrooms1.json','shrooms1_'],-0.03,0.58,0.24,stages.midground, true);
  let shrooms2 = new Actor(['imgs/animations/shrooms2.json','shrooms2_'], 0.57, 0.46, 0.25,stages.midground, true);
  let firstIslandTrees = new Actor(['imgs/animations/island1.json','island1_'], 0.21, -0.06, 0.4, stages.midground, true);
  let swing = new Actor(['imgs/animations/swing.json','swing_'], 2.65, -1.5, 0.6, stages.midground, true);

  let highest = new Actor(['imgs/island2.json','highest_island.png'], 0.2, -1.75, 1.2, stages.midground);
  let glowingLeaves = new Actor('imgs/glowing_leaves.png', 0.45, -0.4, 0.5, stages.midground);
  let bigIsland = new Actor(['imgs/island1.json','big_island.png'], 1.05, -0.35, 0.8, stages.midground);
  let smallIsland = new Actor(['imgs/island2.json','small_island.png'], 1.8, -0.85, 0.7, stages.midground);
  //branches
  let branch1 = new Actor(['imgs/oranges.json','branch_island1.png'], 0.55, -0.08, 0.4, stages.midground);
  let branch2 = new Actor(['imgs/oranges.json','branch_island2.png'], 1.25, -0.03, 0.8, stages.midground);
  let branch3 = new Actor(['imgs/oranges.json','branch_mountain1.png'], 0.2, 0.8, 0.1, stages.midground);
  let branch4 = new Actor(['imgs/oranges.json','branch_mountain2.png'], 0.75, 0.64, 0.13, stages.midground);

  let mainIsland = new Actor('imgs/main_island.png', 2.2, -0.6, 0.9, stages.midground);
  let bridge = new Actor(['imgs/oranges.json','bridge.png'], 3.65, -0.34, 0.17, stages.midground);
  let hangerIsland = new Actor('imgs/hanger_island.png', 3.9, -1.1, 0.9, stages.midground);
  //foreground
  let grass1 = new Actor(['imgs/oranges.json','grass1.png'], 0, 0.8, 0.2, stages.foreground);
  let grass2 = new Actor(['imgs/oranges.json','grass2.png'], 3, 0.8, 0.2, stages.foreground);
  //postprocessing
  let softlight = new Actor('imgs/softlight.png', 0, 0, 1, stages.still);
  softlight.blendMode = PIXI.BLEND_MODES.ADD;
  softlight.alpha = 0.4;
  let overlay = new Actor('imgs/overlay.png', 0, -1, 2, stages.midground);
  overlay.blendMode = PIXI.BLEND_MODES.ADD;
  overlay.alpha = 0.4;

  let overlay2 = new Actor('imgs/overlay.png', 0, -1.2, 2.2, stages.still);
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

  //collision boxes
  let branch = new CollisionBox(0.30, 0.83, 0.15, 0.04);
  let branchh = new CollisionBox(0.20, 0.85, 0.10, 0.04);
  let branchTwo = new CollisionBox(0.85, 0.67, 0.15, 0.04);
  let branchTwoo = new CollisionBox(0.75, 0.7, 0.3, 0.04);
  let branchThree = new CollisionBox(0.65, 0.23, 0.28, 0.04);
  let branchFour = new CollisionBox(1.7, 0.35, 0.4, 0.04);
  let island1collision = new CollisionBox(0.33, 0.3, 0.3, 0.04);
  let island2collision = new CollisionBox(1.1, -0.05, 0.73, 0.04);
  let highestCollision = new CollisionBox(0.4, -1.37, 0.5, 0.04);
  let smallIslandCollision = new CollisionBox(1.92, -0.58, 0.25, 0.04);
  //let swingCollision = new CollisionBox(2.78, -1.21, 0.15, 0.04);
  let bigIslandCollision = new CollisionBox(2.36, -0.2, 1.45, 0.04);
  let bridgeCollision = new CollisionBox(3.67, -0.23, 1.05, 0.04);
  let hangerIslandCollision = new CollisionBox(4.1, -0.74, 0.6, 0.04);
  let ground = new CollisionBox(1.9, 0.9, 1.5, 0.04);
  let ground2 = new CollisionBox(5, 0.95, 0.55, 0.04);
  let hillCollision = new CollisionBox(3.9, 0.5, 0.5, 0.04);
  let hillCollision2 = new CollisionBox(4.4, 0.7, 0.2, 0.04);
  let hillCollision3 = new CollisionBox(4.6, 0.75, 0.5, 0.04);
  //show collision boxes for dev purposes - set visible to false after prodution
  //devFunctions.showCollisionBoxes();

  //other players
  for(var i=0; i<globals.numOfPlayers; i++){
    let otherPlayer = new OtherPlayer(0.2, stages.midground);
  }
  //get the full width of the game and decide world limits based off that
  globals.fullWidth = mountain.width;
  globals.fullHeight = 7000;
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
var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);
function gameLoop(){
  stats.begin();
  ticker.update();
  globals.state();
  stats.end();
  window.requestAnimationFrame(gameLoop);
}
//start game on intro screen
globals.state = states.loading;
window.requestAnimationFrame(gameLoop);
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
        });
      })(i);
    }
  });
  setInterval(function(){
    player.updateServer();
  },1000/30);
}
//about page
dom.aboutButton.addEventListener('click', function(){
  dom.aboutPage.style.display = 'block';
});
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
      globals.playMusic();
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
  dom.hud.style.display = 'block';
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
  },
  showCollisionBoxes: function(){
    for(var i=0; i<globals.collisionComponents.length; i++){
      globals.collisionComponents[i].visible = true;
    }
  }
}

//let island2 = new Actor("imgs/both islands.png", 1.05, -0.35, 0.8, stages.midground);
//island2.cropTexture(0,0,800,0);
