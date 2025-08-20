const app = document.querySelector("#app");
const terminalContainer = document.querySelector('.container');
const redBtn = document.querySelector('.button.red');
const yellowBtn = document.querySelector('.button.yellow');
const greenBtn = document.querySelector('.button.green');
const delay = ms => new Promise(res => setTimeout(res, ms));

// startup auto-typing 
const startup = {
  textUrl: "startup.txt",
  text: "",
  index: 0,
  speed: 8,
  isRunning: false,
  displayed: false,
};

// random title icons
const TITLE_ICON_CLASSES = [
  'fas fa-yin-yang',
  'fas fa-terminal',
  'fas fa-code',
  'fas fa-bolt',
  'fas fa-tv',
  'fas fa-bug',
  'far fa-keyboard',
  'fas fa-headphones',
];

// track last printed command to avoid duplicate outputs
let lastOutputKey = null;
let experienceClicked = false;
let projectsClicked = false;
// track whether help was requested during startup
let helpClickedEarly = false;

// get startup text from file
async function fetchStartupText() {
    try {
        const res = await fetch(startup.textUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        startup.text = await res.text();
    }
    catch(err) {
        createText(`<span class="error">Error: failed to load startup text (${err.message}).</span>`);
        startup.displayted = true;
    }
}

// set blink cursor visible
function setBlinkCursorVisible(visible) {
  const last = app.lastElementChild;
  if (!last) return;
  if (visible) {
    if (!last.querySelector('.cursor')) {
      const span = document.createElement('span');
      span.className = 'cursor';
      last.appendChild(span);
    }
  } 
  else {
    const c = last.querySelector('.cursor');
    if (c) c.remove();
  }
}

// function to interupt startup typing
function stopStartupTyping() {
  if (startup.isRunning) {
    startup.index = startup.text.length;
  } 
  else {
    startup.displayed = true;
  }
}

// ensure the input prompt ( > ) is always at the bottom and visible
function ensurePromptAtBottom() {
  const existing = document.querySelector('.type');
  if (existing) {
    existing.parentNode.removeChild(existing);
  }
  new_line();
  app.scrollTop = app.scrollHeight;
}

// set random title icon
function setRandomTitleIcon() {
  const iconEl = document.querySelector('.menu .title i');
  if (!iconEl) return;
  const choice = TITLE_ICON_CLASSES[Math.floor(Math.random() * TITLE_ICON_CLASSES.length)];
  iconEl.className = choice;
}

// run the startup text immediately on open
async function runStartupTyping() {
  if (startup.displayed) return;
  startup.isRunning = true;
  const container = document.createElement('p');
  container.classList.add('startup-block');
  container.innerHTML = "";
  app.appendChild(container);
  let buffer = "";
  while(startup.index < startup.text.length) {
    const ch = startup.text[startup.index++];
    buffer += ch;
    // render newlines as <br/>
    container.innerHTML = buffer.replace(/\n/g, '<br/>');
    setBlinkCursorVisible(true);
    await delay(startup.speed);
  }
  // trim last <br/> to avoid blank line
  container.innerHTML = container.innerHTML.replace(/(?:<br\s*\/?>(\s)*)+$/i, '');
  setBlinkCursorVisible(false);
  startup.isRunning = false;
}

// terminal interactions
app.addEventListener("keypress", async function(event) {
  if (event.key === "Enter") {
    if (startup.isRunning) {
      // fast-forward typing
      startup.index = startup.text.length;
      return;
    }
    await delay(150);
    const input = document.querySelector("input");
    const value = input ? input.value.trim() : "";
    removeInput();
    await delay(150);
    if (value.length === 0) {
      new_line(); 
      return;
    }
    handleTypeOfCommand(value);
    ensurePromptAtBottom();
  }
});

app.addEventListener("click", function() {
  const input = document.querySelector("input");
  if (input) input.focus();
});

document.addEventListener("keydown", function(event) {
  // esc fast-forward startup
  if (event.key === "Escape" && startup.isRunning) {
    startup.index = startup.text.length;
    return;
  }
  // arrow keys terminal scroll
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    const step = 30; 
    const maxScrollable = app.scrollHeight > app.clientHeight;
    if (maxScrollable) {
      event.preventDefault();
      app.scrollTop += (event.key === 'ArrowDown' ? step : -step);
    }
  }
});

async function open_terminal() {
  // Intro quick messages (can be removed if you prefer only the typing file)
  setRandomTitleIcon();
  await delay(250);
  createText("Welcome!");
  await delay(500);
  createText('Type <a href="#" class="blue cmd" data-cmd="help">help</a> to see available commands.');
  await delay(500);

  // auto-typing block with links from text file
  await fetchStartupText();
  await runStartupTyping();
  await delay(startup.speed);
  
  // after startup finishes, render clickable commands list unless help was clicked early
  if (!helpClickedEarly) {
    renderCommandsList();
    await delay(400);
    ensurePromptAtBottom();
  }
}

function new_line() {
  const p = document.createElement("p");
  p.setAttribute("class", "path");
  const div = document.createElement("div");
  div.setAttribute("class", "type");
  const i = document.createElement("i");
  i.setAttribute("class", "fas fa-angle-right icone");
  const input = document.createElement("input");
  div.appendChild(i);
  div.appendChild(input);
  app.appendChild(div);
  input.focus();
}

// ===== terminal resize logic =====
(function enableResize() {
  const container = document.querySelector('.container');
  const handle = document.querySelector('.resize-handle');
  if (!container || !handle) return;

  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;
  let isResizing = false;

  function onMouseMove(e) {
    if (!isResizing) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const newW = Math.max(320, startW + dx);
    const newH = Math.max(300, startH + dy);
    container.style.width = newW + 'px';
    container.style.height = newH + 'px';
  }

  function onMouseUp() {
    if (!isResizing) return;
    isResizing = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    const rect = container.getBoundingClientRect();
    startW = rect.width;
    startH = rect.height;
    isResizing = true;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
})();

function removeInput() {
  const div = document.querySelector(".type");
  if (div) app.removeChild(div);
}


// ======================================
// ===== Available General Commands =====
// ======================================
// help
function help_command() {
  createCode('<a href="#" class="blue cmd" data-cmd="whoami">whoami</a>', "About me.");
  createCode('<a href="#" class="blue cmd" data-cmd="projects">projects</a>', "Check out my projects.");
  createCode('<a href="#" class="blue cmd" data-cmd="experience">experience</a>', "See my current/past experiences.")
  createCode('<a href="#" class="blue cmd" data-cmd="contact">contact</a>', "Ways to contact me.");
  createCode('<a href="#" class="blue cmd" data-cmd="clear">clear</a>', "Clear the terminal.");
  createCode('<a href="#" class="blue cmd" data-cmd="help">help</a>', "Show this help message.");
  lastOutputKey = 'help';
}

// whoami
function whoami_command() {
  createText("My name is Francis Pham!");
  createText("I am current 4th year at Cornell University studying Electrical & Computer Engineering and Computer Science. \
              My passion involves computer architecture and programming systems. You can find me playing basketball, volleyball, \
              golfing, or doing random stuff :)");

  lastOutputKey = 'whoami';
}

// projects
function projects_command() {
  createText("Click on or run any of the following commands to learn more about my projects");
  createCode('<a href="#" class="blue cmd" data-cmd="cuair">cuair</a>', "Cornell University Unmanned Air Systems");
  createCode('<a href="#" class="blue cmd" data-cmd="bitcoin">bitcoin</a>', "Accelerated Bitcoin Mining Simulation");
  createCode('<a href="#" class="blue cmd" data-cmd="tinyrv">tinyrv</a>', "Tiny RISC-V Multi-Core Processor");
  createCode('<a href="#" class="blue cmd" data-cmd="pocamlpoker">pocamlpoker</a>', "Poker Implementation in OCaml");
  lastOutputKey = 'projects';
}

// experience
function experience_command() {
  createCode('<a href="#" class="blue cmd" data-cmd="nvidia25">nvidia25</a>', "Summer 2025 Software Engineering Intern at NVIDIA");
  createCode('<a href="#" class="blue cmd" data-cmd="nvidia24">nvidia24</a>', "Summer 2024 Software Engineering Intern at NVIDIA");
  createCode('<a href="#" class="blue cmd" data-cmd="capra">capra</a>', "Undergraduate Research Assistant in the Capra research lab at Cornell");
  createCode('<a href="#" class="blue cmd" data-cmd="ta">ta</a>', "Cornell Engineering Undergraduate Teaching Assistant");
  createCode('<a href="#" class="blue cmd" data-cmd="zhangrg">zhangrg</a>', "Undergraduate Research Assistant in the Zhang Research Group at Cornell");
  lastOutputKey = 'experience';
}

// contact
function contact_command() {
  createText("<a href='https://github.com/fpham0701' target='_blank'><i class='fab fa-github white'></i> github.com/fpham0701</a>");
  createText("<a href='https://www.linkedin.com/in/francispham-' target='_blank'><i class='fab fa-linkedin-in white'></i> linkedin.com/in/francispham-</a>");
  createText("<a href='https://www.instagram.com/notfrancispham' target='_blank'><i class='fab fa-instagram'></i> instagram.com/notfrancispham</a>")
  createText("<a href='mailto:fdp25@cornell.edu' target='_blank'><i class='fas fa-envelope white'></i> fdp25@cornell.edu</a>");
  lastOutputKey = 'contact';
}

// clear
async function clear_command() {
  removeInput();
  document.querySelectorAll("p").forEach(e => e.parentNode.removeChild(e));
  document.querySelectorAll("section").forEach(e => e.parentNode.removeChild(e));

  const p = document.createElement("p");
  app.appendChild(p);
  let clearText = "Cleared terminal.";
  let buffer = "";
  let i = 0;
  while (i < clearText.length) {
    const ch = clearText[i++];
    buffer += ch;
    p.textContent = buffer.replace(/\n/g, '<br/>');
    setBlinkCursorVisible(true);
    await delay(startup.speed * 4);
  }
  lastOutputKey = null;
  setBlinkCursorVisible(false);
  await delay(startup.speed);
  renderCommandsList();
  ensurePromptAtBottom();
}


// =====================================
// ========= Projects Commands =========
// =====================================
function cuair_prjCommand() {
  createText("<a href='https://cuair.org/index.html' class='blue' target='_blank'>Cornell University Unmanned Air Systems (CUAir)</a>")
  createText("CUAir is project team at Cornell University that specializes in designing, building, and operating a fully autonomous search \
              and rescue plane. I was part of the Integration and Testing Subteam, working on WLTR, a wing-loading \
              testing rig. Additionally, I was part of the Imaging Systems Subteam, working on integrating a GoPro Hero11 \
              for image capture.");
  lastOutputKey = 'cuair';
}

function bitcoin_prjCommand() {
  createText("<a href='https://github.com/fpham0701/hls-bitcoin-miner' class='blue' target='_blank'>Accelerated Bitcoin Mining Simulation</a");
  createText("As a final project for ECE 6775: High-Level Digital Design Automation, my group and I created a \
              bitcoing mining simulation that focused on different HLS techniques such as loop tiling/unrolling \
              as well as array partitioning. We were able to achieve a 6.7x speedup when running the main SHA-256 algorithm on an FPGA.")
  lastOutputKey = 'bitcoin';
}

function tinyrv_prjCommand() {
  createText("<a href='https://github.com/fpham0701/tinyrv' class='blue' target='_blank'>Tiny RISC-V Multicore Processor</a>");
  createText("For ECE 4750: Computer Architecture, I designed a fully functional processor \
              based of the a subset of the RISC-V ISA. This included designing an variable-latency multiplier, a fully-bypassed pipeliend \
              5-stage CPU, direct mapped / 2-way set set-associative caches, and a ring network for multi-core capabilities.")
  lastOutputKey = 'tinyrv';
}

function pocamlpoker_prjCommand() {
  createText("<a href='' class='blue' target='_blank'>pocamlPoker</a>");
  createText("For CS 3110: Functional Programming, I created a command-line implementation of texas hold'em poker in OCaml. The program has pot betting capabilities and \
              pretty prints cards. Players take turn looking at their cards and choosing to bet.")
  lastOutputKey = 'pocamlpoker';
}


// =====================================
// ======== Experience Commands ========
// =====================================
function nvidia25_expCommand() {
  createText("<i class='fas fa-laptop-code'></i> NVIDIA (May 2025 -- Aug 2025):");
  createText("For this summer at NVIDIA, I worked on creating a LLM-driven, coverage-guided fuzzer used to find bugs in different \
              compiler spaces. This tool was used by various groups and was helpful in finding errors in development code.")
  lastOutputKey = 'nvidia25';
}

function nvidia24_expCommand() {
  createText("<i class='fa-solid fa-computer'></i> NVIDIA (May 2024 -- Aug 2024):");
  createText("For this summer at NVIDIA, I had the chance to work with the compiler verification team to help integrate the \
              verification flow for MLIR (Multi-Level Intermediate Representation). I mainly worked on the automated testing \
              pipeline for the NVVM Dialect, in order to collect performance metrics for compilation as well as improved \
              functionality testing.")
  lastOutputKey = 'nvidia24';
}

function capra_expCommand() {
  createText("<i class='fa-solid fa-memory'></i> Capra (Sep 2024 -- Present):");
  createText("I joined <a href='https://capra.cs.cornell.edu/' class='blue' target='_blank'>CAPRA</a>, a research group advised by Professor Adrian Sampson \
              at Cornell that focuses on computer architecture & programming abstractions. Under Kevin Laeufer, I work on building Protocols, a \
              Rust-based hardware verification langauge that models RTL.");
  lastOutputKey = 'capra';
}

function ta_expCommand() {
  createText("<i class='fa-solid fa-person-chalkboard'></i> Cornell Engineering Undergraduate Teaching Assistant:");
  createText("I have been a teaching assistant in Cornell Engineering for several semesters. Here are some of the classes that I have taught:<br> \
              - ECE 4750 / CS 4420 (Computer Architecture -- FA'25)<br> \
              - ECE 4271 (Evolutionary Processes, Algorithms, and Games -- SP'25)<br> \
              - ECE 2100 (Circuits -- FA'23, SP'24, FA'24)");
  lastOutputKey = 'ta';
}

function zhangrg_expCommand() {
  createText("<i class='fa-solid fa-sim-card'></i> Zhang Research Group (Aug 2023 -- Dec 2024):");
  createText("I joined the <a href='https://zhang.ece.cornell.edu/index.html' class='blue' target='_blank'>Zhang Research Group</a>, advised by Professor \
              Zhiru Zhang to work on Allo, a programming model for composable accelerator design. For this project, I worked on creating a \
              benchmark testing suite for verification.");
  lastOutputKey = 'zhangrg';
}

// ======================================
// ========== Command Handlers ==========
// ======================================
// central command handler
function handleCommand(value) {
  if (lastOutputKey != 'experience' || value != 'experience') {
    experienceClicked = false;
  }
  if (lastOutputKey != 'projects' || value != 'projects') {
    projectsClicked = false;
  }

  if (value === "help") {
    if (lastOutputKey === 'help') return;
    trueValue(value);
    help_command();
    lastOutputKey = 'help';
    ensurePromptAtBottom();
    return;
  }
  if (value === "whoami") {
    if (lastOutputKey === 'whoami') return;
    trueValue(value);
    whoami_command();
    ensurePromptAtBottom();
    return;
  }
  if (value === "projects") {
    if (lastOutputKey === 'projects') return;
    trueValue(value);
    projects_command();
    projectsClicked = true;
    ensurePromptAtBottom();
    return;
  }
  if (value === "experience") {
    if (lastOutputKey == 'experience') return;
    trueValue(value);
    experience_command();
    experienceClicked = true;
    ensurePromptAtBottom();
    return;
  }
  if (value === "contact") {
    if (lastOutputKey === 'contact') return;
    trueValue(value);
    contact_command();
    ensurePromptAtBottom();
    return;
  }
  if (value === "clear") {
    clear_command();
    return;
  }
  falseValue(value);
  lastOutputKey = null;
  createText(`command not found: ${value}. Type <a href="#" class="blue cmd" data-cmd="help">help</a> to see available commands.`);
  ensurePromptAtBottom();
}

// projects command handler
function handleProjectsCommand(value) {
  if (value === "projects" && lastOutputKey != 'projects') handleCommand(value);
  if (value === "cuair") {
    if (lastOutputKey === 'cuair') return;
    trueValue(value);
    cuair_prjCommand();
    ensurePromptAtBottom();
    return;
  }
  if (value === 'bitcoin') {
    if (lastOutputKey === 'bitcoin') return;
    trueValue(value);
    bitcoin_prjCommand();
    ensurePromptAtBottom();
    return;
  }
  if (value === 'tinyrv') {
    if (lastOutputKey === 'tinyrv') return;
    trueValue(value);
    tinyrv_prjCommand();
    ensurePromptAtBottom();
    return;
  }
  if (value === 'pocamlpoker') {
    if (lastOutputKey === 'pocamlpoker') return;
    trueValue(value);
    pocamlpoker_prjCommand();
    ensurePromptAtBottom();
    return;
  }
  handleCommand(value);
}

// experience command handler
function handleExperienceCommand(value) {
  if (value === "experience" && lastOutputKey != 'experience') handleCommand(value);
  if (value === "nvidia25") {
    if (lastOutputKey === 'nvidia25') return;
    trueValue(value);
    nvidia25_expCommand();
    ensurePromptAtBottom();
    return;
  }
  if (value === "nvidia24") {
    if (lastOutputKey === 'nvidia24') return;
    trueValue(value);
    nvidia24_expCommand();
    ensurePromptAtBottom();
    return;
  }
  if (value === "capra") {
    if (lastOutputKey === 'capra') return;
    trueValue(value);
    capra_expCommand();
    ensurePromptAtBottom();
    return;
  }
  if (value === "ta") {
    if (lastOutputKey === 'ta') return;
    trueValue(value);
    ta_expCommand();
    ensurePromptAtBottom();
    return;
  }
  if (value === "zhangrg") {
    if (lastOutputKey === 'zhangrg') return;
    trueValue(value);
    zhangrg_expCommand();
    ensurePromptAtBottom();
    return;
  }
  handleCommand(value);
}

// type of command handler (central, experience, projects)
function handleTypeOfCommand(value) {
  if (experienceClicked) {
    handleExperienceCommand(value);
  }
  else if (projectsClicked) {
    handleProjectsCommand(value);
  }
  else {
    handleCommand(value);
  }}


// clickable command list in blue, appended after startup
function renderCommandsList() {
  if (document.querySelector('.commands')) return;
  const container = document.createElement('p');
  container.className = 'commands';
  container.innerHTML = `Available commands: 
    <a href="#" class="blue cmd" data-cmd="whoami">whoami</a>
    <a href="#" class="blue cmd" data-cmd="projects">projects</a>
    <a href="#" class="blue cmd" data-cmd="experience">experience</a>
    <a href="#" class="blue cmd" data-cmd="contact">contact</a>
    <a href="#" class="blue cmd" data-cmd="help">help</a>
    <a href="#" class="blue cmd" data-cmd="clear">clear</a>
  `;
  app.appendChild(container);
}

// correct command input (green)
function trueValue(value) {
  const div = document.createElement("section");
  div.setAttribute("class", "type2");
  const i = document.createElement("i");
  i.setAttribute("class", "fas fa-angle-right icone");
  const msg = document.createElement("h2");
  msg.setAttribute("class", "success");
  msg.textContent = `${value}`;
  div.appendChild(i);
  div.appendChild(msg);
  app.appendChild(div);
}

// incorrect command input (red)
function falseValue(value) {
  const div = document.createElement("section");
  div.setAttribute("class", "type2");
  const i = document.createElement("i");
  i.setAttribute("class", "fas fa-angle-right icone error");
  const msg = document.createElement("h2");
  msg.setAttribute("class", "error");
  msg.textContent = `${value}`;
  div.appendChild(i);
  div.appendChild(msg);
  app.appendChild(div);
}

// create text output
function createText(text) {
  const p = document.createElement("p");
  p.innerHTML = text;
  app.appendChild(p);
}

// create code output
function createCode(code, text) {
  const p = document.createElement("p");
  p.setAttribute("class", "code");
  p.innerHTML = `${code} <br/><span class='text'> ${text} </span>`;
  app.appendChild(p);
}

// global command click handler
document.addEventListener('click', async function(e) {
  const link = e.target.closest('a.cmd');
  if (!link) return;
  e.preventDefault();
  stopStartupTyping();
  const cmd = link.getAttribute('data-cmd');
  if (cmd === 'help') helpClickedEarly = true;
  await delay(125);
  handleTypeOfCommand(cmd);
});

open_terminal();

// =====================================
// ========== Button Handlers ==========
// =====================================
// red button (close and then open)
(function enableCloseReopen() {
  if (!terminalContainer || !redBtn) return;

  let isTransitioning = false;

  function waitForAnimation(element) {
    return new Promise(resolve => {
      const onEnd = () => {
        element.removeEventListener('animationend', onEnd);
        resolve();
      };
      element.addEventListener('animationend', onEnd, { once: true });
    });
  }

  async function closeAndReopen(waitMs = 2000) {
    if (isTransitioning) return; 

    isTransitioning = true;
    // close animation
    terminalContainer.classList.remove('opening');
    terminalContainer.classList.add('closing');
    await waitForAnimation(terminalContainer);
    terminalContainer.classList.remove('closing');
    terminalContainer.classList.add('hidden');

    // delay
    await delay(waitMs);
    
    // open animation
    terminalContainer.classList.remove('hidden');
    terminalContainer.classList.add('opening');
    await waitForAnimation(terminalContainer);
    terminalContainer.classList.remove('opening');
    isTransitioning = false;
  }

  redBtn.addEventListener('click', () => closeAndReopen(2000));
})();


// green button (toggle maximize)
(function toggleSize() {
  if (!terminalContainer || !greenBtn) return;

  let lastSize = null; // { cur_w: #px, cur_h: #px }
  let isMaximized = false;

  function getMaxSize() {
    const computedSytle = window.getComputedStyle(terminalContainer);
    return { w: computedSytle.maxWidth, h: computedSytle.maxHeight };
  }

  function getCurrentSize() {
    const rect = terminalContainer.getBoundingClientRect();
    return { cur_w: rect.width + 'px', cur_h: rect.height + 'px' };
  }

  function setSize(wPx, hPx) {
    terminalContainer.style.width = wPx;
    terminalContainer.style.height = hPx;
  }

  function maximize() {
    const { w, h } = getMaxSize();
    const { cur_w, cur_h } = getCurrentSize();
    if (((parseInt(w, 10) - 50) < parseInt(cur_w, 10)) && ((parseInt(h, 10) - 25) < parseInt(cur_h, 10))) {
      lastSize = { cur_w: "800px", cur_h: "600px"};
    } 
    else {
      lastSize = getCurrentSize();
    }
    setSize(w, h);
    isMaximized = true;
  }   

  function restore() {
    if (lastSize) {
      setSize(lastSize.cur_w, lastSize.cur_h);
    }
    isMaximized = false;
  }

  greenBtn.addEventListener('click', () => {
    if (!isMaximized) {
      maximize();
    } 
    else {
      restore();
    }
  });
})();

// yellow button (clears)
(function clearBtn() {
  yellowBtn.addEventListener('click', () => {
    stopStartupTyping();
    helpClickedEarly = true;
    setTimeout(clear_command, 500);
  })
})();