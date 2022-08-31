let MIN_DELAY;
let MAX_DELAY;
const BG_VELOCITY = 0.4 * 0.06 /* vw per ms */; 
const INITIAL_ROAD_VELOCITY = 1.7 * 0.06;
const SCORE_TO_CHANGE_VELOCITY = 150;

// genertal  animation
let deltaT;
let previousTimeStamp;
let done = false;

// background animation
let roadVelocity = 1.7 * 0.06;
let currBackgroundX = 0;
let currRoadX = 0;

// obstacle animation 
let typesOfObstacles = ["tall-obstacle", "short-obstacle"];
let obstacleTimeOut;

// Variables that are in loops (refrain from creating too much variables)
let obstacleX;
let newObstacle;
let obstacleArray = [];
let tembelClientRect;
let obstacleClientRect;
let collisions;
let velocityMultiplier;
let wrapper;

// general
let pauseDelay;
let score = 0;
let scoreInterval;
let highScores;
let continueTimer;
let isDead;

// PWA (progressive web app)
let deferredPrompt;

/* handle service workers - outside of load function*/
if ('serviceWorker' in navigator) {
  /* remove previously registeres service workers */
  // navigator.serviceWorker.getRegistrations().then( function(registrations) { for(let registration of registrations) { registration.unregister(); } }); 
  navigator.serviceWorker.register('serviceWorker.js');
}


/* load function
------------------------------------------------------------------------------------------------------------------------------
description:  */
window.addEventListener("load", () => { 
  window.addEventListener('beforeinstallprompt', addToHome);
  MAX_DELAY = window.innerWidth/INITIAL_ROAD_VELOCITY * 0.35;
  MIN_DELAY = window.innerWidth/INITIAL_ROAD_VELOCITY * 0.15;
  addListeners();
  // restore high scores
  highScores = [];
  let savedHighScores = JSON.parse(localStorage.getItem(`highScores`) ?? "[0,0,0,0,0]");
  savedHighScores.forEach((item, index) => {
    highScores[index] = item;
  })
});

/* addToHome
------------------------------------------------------------------------------------------------------------------------------
description: enable PWA */
const addToHome = (e) => {
  console.log("add to home");
  let deferredPrompt;
  let addBtn = document.getElementById("add-to-home");
  document.getElementById("body").style.pointerEvents = "none";
  document.getElementById("add-to-home-msg").style.pointerEvents = "all";
  // The user agrees to create shortcut
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // count visits and Update UI to notify the user they can add to home screen
  let visitCount = localStorage.getItem('visitCount');
  if (visitCount === null) {
    localStorage.setItem("visitCount", 1);
  } else {
    visitCount++;
    console.log(visitCount);
    localStorage.setItem("visitCount", visitCount);
    setTimeout (() => {
      document.getElementById("add-to-home-msg").classList.remove("none");
      document.getElementById("add-to-home-msg").classList.add('pop-up');
      addBtn.addEventListener('click', (e) => {
      // hide our user interface that shows our A2HS button
      document.getElementById("add-to-home-msg").classList.add('none');
      document.getElementById("body").style.pointerEvents = "all";
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('User accepted the A2HS prompt');
            }
            deferredPrompt = null;
          });
       });
      // When the user presses X
      document.getElementById("close-msg").addEventListener("click", () => {
      document.getElementById("add-to-home-msg").classList.remove('pop-up');
      document.getElementById("add-to-home-msg").classList.add('reverse-pop-up');
      document.getElementById("add-to-home-msg").addEventListener("animationend", () => {
        document.getElementById("add-to-home-msg").classList.add('none');
        document.getElementById("body").style.pointerEvents = "all";
      })
       });
    }, 1000);
  }

}

/* addListeners
------------------------------------------------------------------------------------------------------------------------------
description:  */
const addListeners = () => {
  // start listeners
  document.getElementById("start").addEventListener("click", startGame);
  document.getElementById("start").addEventListener("click", fullScreen);
  // Will be activated when full screen icon is shown
  document.getElementById("full-screen-btn").addEventListener("click", fullScreen);
  // Pause screen listeners
  document.getElementById("resume").addEventListener("click", checkOrientation);
  document.getElementById("quit").addEventListener("click", endGame);
  // End-screen listeners
  document.getElementById("replay").addEventListener("click", startGame);
  document.getElementById("best-scores").addEventListener("click", showScores);
}

/* checkOrientation
------------------------------------------------------------------------------------------------------------------------------
description: happens before continueGame or when screen size change.
make sure the view is landscape and not portrait */
const checkOrientation = () => {
  clearTimeout(continueTimer);
  document.getElementById("pause-message").classList.add("none");
  visualViewport.addEventListener("resize", checkOrientation);
  if (window.innerWidth < window.innerHeight) {
    document.getElementById("click-area").removeEventListener("click", jump);
    document.getElementById("tembel").removeEventListener("click", jump);
    document.getElementById("pause").removeEventListener("click", pause);
    done = true;
    document.getElementById("portrait-error").classList.remove("none");
    document.getElementById("full-screen-btn").classList.remove("none");
  } else {
    continueGame();
    document.getElementById("portrait-error").classList.add("none");
  }
}

/* startGame
------------------------------------------------------------------------------------------------------------------------------
description:  */
const startGame = (event) => {
  roadVelocity = INITIAL_ROAD_VELOCITY;
  done = false;
  score = 0;
  currBackgroundX = 0;
  currRoadX = 0;
  previousTimeStamp = undefined;
  // resets obstacles
  document.querySelectorAll(".obstacle").forEach((el => {
    el.remove();
  }));
  document.getElementById("end-message").classList.add("none");
  document.getElementById("tembel").classList.remove("none");
  document.getElementById("start-message").classList.add("none");
  document.getElementById("click-area").addEventListener("click", jump);
  document.getElementById("replay").removeEventListener("click", startGame);
  checkOrientation();
    // pause the game when user changes tabs
    document.addEventListener("visibilitychange", event => {
      if (document.visibilityState !== "visible") {
        let stop = new Event("click");
        document.getElementById("pause").dispatchEvent(stop);
      }
    });
}

/* fullScreen
------------------------------------------------------------------------------------------------------------------------------
description:  */
const fullScreen = () => {
  if (!document.webkitFullscreenElement) {
    document.documentElement.webkitRequestFullscreen();
    document.getElementById("full-screen-btn").src = "assets/media/compress.svg";
  } else if (document.webkitExitFullscreen) {
    document.getElementById("full-screen-btn").src = "assets/media/expand.svg";
    document.exitFullscreen();
  }
}

/* jump
------------------------------------------------------------------------------------------------------------------------------
description:  */
const jump = (event) => {
  let animationTime = 0.7 * 1000;
  document.getElementById("click-area").removeEventListener("click", jump);
  document.getElementById("tembel").removeEventListener("click", jump);
  document.getElementById("tembel").classList.add("jump");
  setTimeout(() => {
    document.getElementById("click-area").addEventListener("click", jump);
    document.getElementById("tembel").addEventListener("click", jump);
    document.getElementById("tembel").classList.remove("jump");
  }, animationTime);
}

/* pause
------------------------------------------------------------------------------------------------------------------------------
description:  */
const pause = (event) => {
  document.getElementById("full-screen-btn").classList.remove("none");
  visualViewport.removeEventListener("resize", checkOrientation);
  document.getElementById("tembel").removeEventListener("click", jump);
  document.getElementById("click-area").removeEventListener("click", jump);
  document.getElementById("pause").removeEventListener("click", pause);
  done = true;
  document.getElementById("pause-message").classList.remove("none");
}

/* continueGame
------------------------------------------------------------------------------------------------------------------------------
description:  */
const continueGame = () => {
  window.removeEventListener('beforeinstallprompt', addToHome);
  document.getElementById("full-screen-btn").classList.add("none");
    document.getElementById("click-area").addEventListener("click", jump);
    document.getElementById("tembel").addEventListener("click", jump);
    document.getElementById("timer").innerText = `3`;
    document.getElementById("timer").classList.remove("none");
    continueTimer = setTimeout(delayCounter, 1000, 2);
}

/* delayCounter
------------------------------------------------------------------------------------------------------------------------------
description:  */
const delayCounter = (secondsLeft) => {
  if (secondsLeft === 0) {
    document.getElementById("timer").classList.add("none");
    window.requestAnimationFrame(handleAnimations);
    obstacleTimeOut = setTimeout(createObstacles, Math.round(Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY));
    done = false;
    document.getElementById("pause").addEventListener("click", pause);
    scoreInterval = setInterval(scoreUpdate, 100);
  } else {
    document.getElementById("timer").innerText = `${secondsLeft}`;
    secondsLeft--;
    continueTimer = setTimeout(delayCounter, 1000, secondsLeft);
  }
} 

/* scoreUpdate
------------------------------------------------------------------------------------------------------------------------------
description:  */
const scoreUpdate = () => {
  score++;
  document.getElementById("score").innerText = `ניקוד: ${score}`;
  velocityMultiplier = Math.floor(score/SCORE_TO_CHANGE_VELOCITY) * 0.125 + 1;
  roadVelocity = INITIAL_ROAD_VELOCITY * velocityMultiplier;
}

/* handleAnimations
------------------------------------------------------------------------------------------------------------------------------
description:  */
const handleAnimations = (timestamp) => {
  if (previousTimeStamp === undefined) {
    previousTimeStamp = timestamp;
  }
  if(!done) {
    window.requestAnimationFrame(handleAnimations);
    deltaT = timestamp - previousTimeStamp;
    if (deltaT < 160) {
      animateBackground();
      animateObstacles()
      checkCollision();
    }
  } else {
    clearTimeout(obstacleTimeOut);
    clearInterval(scoreInterval);
  }
  previousTimeStamp = timestamp;
}

/* animateBackground, createObstacles, animateObstacles
------------------------------------------------------------------------------------------------------------------------------
description:  */
const animateBackground = () => {
  currBackgroundX -= BG_VELOCITY * deltaT;
  document.getElementById("body").style.backgroundPositionX = `${currBackgroundX}vw`;
  currRoadX -= roadVelocity * deltaT;
  document.getElementById("road").style.backgroundPositionX = `${currRoadX}vw`;
}

const createObstacles = () => {
  newObstacle = document.createElement("div");
  obstacleType = typesOfObstacles[Math.round(Math.random(typesOfObstacles.length))];
  newObstacle.classList.add("obstacle", obstacleType);
  newObstacle.style.right = "0vw";
  document.getElementById("body").prepend(newObstacle);
  obstacleTimeOut = setTimeout(createObstacles, Math.round(Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY));
}

const animateObstacles = () => {
  obstacleArray = document.querySelectorAll(".obstacle");
    obstacleArray.forEach((element) => {
      obstacleX = Number(element.style.right.slice(0, -2));
      obstacleX += roadVelocity * deltaT;
      if (obstacleX > 110) {
        element.remove();
      }
      element.style.right = `${obstacleX}vw`;
    });
};

/* checkCollision
------------------------------------------------------------------------------------------------------------------------------
description:  */
const checkCollision = () => {
  tembelClientRect = document.getElementById("tembel").getBoundingClientRect();
  for (let index = 0; index < obstacleArray.length; index++) {
    obstacleClientRect = obstacleArray[index].getBoundingClientRect();
    if (tembelClientRect.x < obstacleClientRect.x + obstacleClientRect.width &&
      tembelClientRect.x + tembelClientRect.width > obstacleClientRect.x &&
      tembelClientRect.y < obstacleClientRect.y + obstacleClientRect.height &&
      tembelClientRect.height + tembelClientRect.y > obstacleClientRect.y) {
        // Make sure the collision was longer than 10ms so the user could see it happening
        setTimeout (() => {
          if (tembelClientRect.x < obstacleClientRect.x + obstacleClientRect.width &&
            tembelClientRect.x + tembelClientRect.width > obstacleClientRect.x &&
            tembelClientRect.y < obstacleClientRect.y + obstacleClientRect.height &&
            tembelClientRect.height + tembelClientRect.y > obstacleClientRect.y) {
              isDead = true;
              return;
          }
      }, 17);
      endGame();
      break;
    }
  };
}

/* endGame
------------------------------------------------------------------------------------------------------------------------------
description:  */
const endGame = () => {
  isDead = false;
  window.addEventListener('beforeinstallprompt', addToHome);
  document.getElementById("full-screen-btn").classList.remove("none");
  visualViewport.removeEventListener("resize", checkOrientation);
  document.getElementById("pause").removeEventListener("click", pause);
  document.getElementById("pause-message").classList.add("none");
  done = true;
  document.getElementById("score").innerText = "ניקוד";
  document.getElementById("end-score").innerHTML = score > highScores[0] ? `<span class="bold">שיא חדש!</span> צברתם ${score} נקודות` :`צברתם ${score} נקודות`;
  document.getElementById("end-message").classList.remove("none");
  document.getElementById("tembel").classList.add("none");
    document.getElementById("replay").addEventListener("click", startGame);
  // update high scores
  if (score > highScores[4]) {
    console.log("adding new high score to the list");
    highScores[4] = score;
    highScores.sort((a, b) => {return(b-a)});
  }
  document.getElementById("score-list").innerHTML = "";
  highScores.forEach((item, index) => {
    // add to show scores screen
    wrapper = El("div", {cls: "score-wrap"} ,
    El("img", {attributes: {"src":"assets/media/goldenStar.svg", alt:"כוכב", class: "golden-star"}}), 
    El("div", {cls: "score-text"} ,`  ${item}`));
    document.getElementById("score-list").appendChild(wrapper);
  });
  // add to localStorage
  localStorage.setItem(`highScores`, JSON.stringify(highScores));
}

/* showScores
------------------------------------------------------------------------------------------------------------------------------
description:  */
const showScores = () => {
  document.getElementById("show-scores").classList.remove("none");
  document.getElementById("end-message").classList.add("none");
  document.getElementById('X').addEventListener("click", () => {    
    document.getElementById("show-scores").classList.add("none");
    document.getElementById("end-message").classList.remove("none");
  })
}

/* El
------------------------------------------------------------------------------------------------------------------------------
description:  */
function El(tagName, options = {}, ...children) {
  let el = Object.assign(document.createElement(tagName), options.fields || {});
  if (options.classes && options.classes.length)
    el.classList.add(...options.classes);
  else if (options.cls) el.classList.add(options.cls);
  if (options.id) el.id = options.id;
  el.append(...children.filter((el) => el));
  for (let listenerName of Object.keys(options.listeners || {}))
    if (options.listeners[listenerName])
      el.addEventListener(listenerName, options.listeners[listenerName], false);
  for (let attributeName of Object.keys(options.attributes || {})) {
    if (options.attributes[attributeName] !== undefined)
      el.setAttribute(attributeName, options.attributes[attributeName]);
  }
  return el;
}
