import "./style.css";

// ?raw to make vite import as string
import triangleVertWGSL from "./shaders/triangle.vert.wgsl?raw";
import redFragWGSL from "./shaders/metaballs.frag.wgsl?raw";

type Point2D = {
  x: number;
  y: number;
  z: number;
};

type Point3D = {
  z: number;
} & Point2D;

type Ball = {
  radius: number;
  velocity: Point3D;
} & Point3D;
const FLOAT_SIZE = 4;

// setup canvas and device

const canvas = document.querySelector("canvas") as HTMLCanvasElement;
// for some reason events get eaten on the canvas
const info = document.querySelector("#info") as HTMLDivElement;
const body = document.querySelector("body") as HTMLBodyElement;

const adapter = await navigator.gpu?.requestAdapter({
  featureLevel: "compatibility",
});

if (!adapter) {
  throw new Error("No adapter found");
}
const device = await adapter?.requestDevice();

if (!device) {
  throw new Error("No device found");
}

const context = canvas.getContext("webgpu") as GPUCanvasContext;

const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

context.configure({
  device,
  format: presentationFormat,
});

const pipeline = device.createRenderPipeline({
  layout: "auto",
  vertex: {
    module: device.createShaderModule({
      code: triangleVertWGSL,
    }),
  },
  fragment: {
    module: device.createShaderModule({
      code: redFragWGSL,
    }),
    targets: [
      {
        format: presentationFormat,
      },
    ],
  },
  primitive: {
    topology: "triangle-list",
  },
});

// setup uniforms
// color uniform
const colorUniformSize = FLOAT_SIZE * 4;
const colorBuffer = device.createBuffer({
  size: colorUniformSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const colorBufferValues = new Float32Array(colorUniformSize / 4);

const generateBalls = (count: number) => {
  const balls: Ball[] = [];
  for (let i = 0; i < count; i++) {
    balls.push({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      radius: Math.random() * 0.01 + 0.1,
      velocity: {
        x: Math.random() * 0.2 - 0.1,
        y: Math.random() * 0.2 - 0.1,
        z: Math.random() * 0.2 - 0.1,
      },
    });
  }
  return balls;
};

// ball uniform
// const balls: Ball[] = [
//   {
//     x: 0.5,
//     y: 0.2,
//     z: 0.0,
//     radius: 0.2,
//     velocity: { x: 0.2, y: 0.2, z: -0.2 },
//   },
//   {
//     x: 0.3,
//     y: 0.6,
//     z: 0.0,
//     radius: 0.25,
//     velocity: { x: -0.01, y: 0.2, z: 0.2 },
//   },
// ];

const balls = generateBalls(50);

const ballCount = balls.length;

const ballStride = 7;

const ballUniformSize = FLOAT_SIZE * ballStride * ballCount;

const ballsToBufferValues = (balls: Ball[]) => {
  const bufferValues = new Float32Array(ballUniformSize / FLOAT_SIZE);
  balls.forEach((ball, index) => {
    bufferValues[index * ballStride] = ball.x;
    bufferValues[index * ballStride + 1] = ball.y;
    bufferValues[index * ballStride + 2] = ball.z;
    bufferValues[index * ballStride + 3] = ball.radius;
    bufferValues[index * ballStride + 4] = ball.velocity.x;
    bufferValues[index * ballStride + 5] = ball.velocity.y;
    bufferValues[index * ballStride + 6] = ball.velocity.z;
  });
  return bufferValues;
};

const ballBuffer = device.createBuffer({
  size: ballUniformSize,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

// canvas size uniform
const canvasSizeUniformSize = FLOAT_SIZE * 2;
const canvasSizeBuffer = device.createBuffer({
  size: canvasSizeUniformSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const canvasSizeBufferValues = new Float32Array(
  canvasSizeUniformSize / FLOAT_SIZE
);
canvasSizeBufferValues[0] = canvas.width;
canvasSizeBufferValues[1] = canvas.height;

// time uniform
const timeUniformSize = FLOAT_SIZE;
const timeBuffer = device.createBuffer({
  size: timeUniformSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const timeBufferValues = new Float32Array(timeUniformSize / FLOAT_SIZE);

// camera z uniform
const cameraZUniformSize = FLOAT_SIZE;
const cameraZBuffer = device.createBuffer({
  size: cameraZUniformSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const cameraZBufferValues = new Float32Array(cameraZUniformSize / FLOAT_SIZE);

// bind all uniforms
const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: { buffer: colorBuffer } },
    { binding: 1, resource: { buffer: ballBuffer } },
    { binding: 2, resource: { buffer: canvasSizeBuffer } },
    { binding: 3, resource: { buffer: timeBuffer } },
    { binding: 4, resource: { buffer: cameraZBuffer } },
  ],
});

// setup event listeners
let upArrowPressed = false;
let downArrowPressed = false;

body.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") {
    console.log("up arrow pressed");
    upArrowPressed = true;
  }
  if (event.key === "ArrowDown") {
    downArrowPressed = true;
  }
});

body.addEventListener("keyup", (event) => {
  if (event.key === "ArrowUp") {
    console.log("up arrow released");
    upArrowPressed = false;
  }
  if (event.key === "ArrowDown") {
    downArrowPressed = false;
  }
});

const CAMERA_SPEED = 0.5;

// why does this function not exist in js?
const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(value, max));
};

// loop

let time = new Date().getTime();

function frame() {
  const newTime = new Date().getTime();
  const deltaTime = (newTime - time) / 1000;
  time = newTime;

  const colorTime = time / 1000;

  balls.forEach((ball) => {
    ball.x += ball.velocity.x * deltaTime;
    ball.y += ball.velocity.y * deltaTime;
    ball.z += ball.velocity.z * deltaTime;

    if (ball.x < 0 || ball.x > 1) {
      ball.velocity.x = -ball.velocity.x;
    }
    if (ball.y < 0 || ball.y > 1) {
      ball.velocity.y = -ball.velocity.y;
    }
    if (ball.z < 0 || ball.z > 1) {
      ball.velocity.z = -ball.velocity.z;
    }

    // console.log({ ball });
  });

  if (upArrowPressed) {
    cameraZBufferValues[0] += CAMERA_SPEED * deltaTime;
  }
  if (downArrowPressed) {
    cameraZBufferValues[0] -= CAMERA_SPEED * deltaTime;
  }
  cameraZBufferValues[0] = clamp(cameraZBufferValues[0], 0, 1);

  info.textContent = `Camera Z: ${cameraZBufferValues[0]}`;

  colorBufferValues[0] = Math.sin(colorTime);
  colorBufferValues[1] = Math.cos(colorTime);
  colorBufferValues[2] = Math.tan(colorTime);
  colorBufferValues[3] = Math.atan(colorTime);
  timeBufferValues[0] = deltaTime;

  const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();

  const ballBufferValues = ballsToBufferValues(balls);

  device.queue.writeBuffer(colorBuffer, 0, colorBufferValues);
  device.queue.writeBuffer(ballBuffer, 0, ballBufferValues);
  device.queue.writeBuffer(canvasSizeBuffer, 0, canvasSizeBufferValues);
  device.queue.writeBuffer(timeBuffer, 0, timeBufferValues);
  device.queue.writeBuffer(cameraZBuffer, 0, cameraZBufferValues);

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: textureView,
        clearValue: [0, 0, 0, 0], // Clear to transparent
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };

  const pass = commandEncoder.beginRenderPass(renderPassDescriptor);
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.draw(6);
  pass.end();

  device.queue.submit([commandEncoder.finish()]);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
