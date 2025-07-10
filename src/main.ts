import "./style.css";

// ?raw to make vite import as string
import triangleVertWGSL from "./shaders/triangle.vert.wgsl?raw";
import redFragWGSL from "./shaders/red.frag.wgsl?raw";

type Ball = {
  radius: number;
  velocity: Point;
} & Point;
const FLOAT_SIZE = 4;

// setup canvas and device

const canvas = document.querySelector("canvas") as HTMLCanvasElement;
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

type Point = {
  x: number;
  y: number;
};

// ball uniform
const balls: Ball[] = [
  { x: 0.5, y: 0.2, radius: 0.2, velocity: { x: 0.2, y: 0.2 } },
  { x: 0.3, y: 0.6, radius: 0.2, velocity: { x: -0.01, y: 0.2 } },
];

const ballCount = balls.length;

const ballStride = 5;

const ballUniformSize = FLOAT_SIZE * ballStride * ballCount;

const ballsToBufferValues = (balls: Ball[]) => {
  const bufferValues = new Float32Array(ballUniformSize / FLOAT_SIZE);
  balls.forEach((ball, index) => {
    bufferValues[index * ballStride] = ball.x;
    bufferValues[index * ballStride + 1] = ball.y;
    bufferValues[index * ballStride + 2] = ball.radius;
    bufferValues[index * ballStride + 3] = ball.velocity.x;
    bufferValues[index * ballStride + 4] = ball.velocity.y;
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

// bind both uniforms
const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: { buffer: colorBuffer } },
    { binding: 1, resource: { buffer: ballBuffer } },
    { binding: 2, resource: { buffer: canvasSizeBuffer } },
  ],
});

let time = new Date().getTime();

function frame() {
  const newTime = new Date().getTime();
  const deltaTime = (newTime - time) / 1000;
  time = newTime;

  const colorTime = time / 1000;

  balls.forEach((ball) => {
    ball.x += ball.velocity.x * deltaTime;
    ball.y += ball.velocity.y * deltaTime;

    if (ball.x < 0 || ball.x > 1) {
      ball.velocity.x = -ball.velocity.x;
    }
    if (ball.y < 0 || ball.y > 1) {
      ball.velocity.y = -ball.velocity.y;
    }
  });

  colorBufferValues[0] = Math.sin(colorTime);
  colorBufferValues[1] = Math.cos(colorTime);
  colorBufferValues[2] = Math.tan(colorTime);
  colorBufferValues[3] = Math.atan(colorTime);

  const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();

  const ballBufferValues = ballsToBufferValues(balls);

  device.queue.writeBuffer(colorBuffer, 0, colorBufferValues);
  device.queue.writeBuffer(ballBuffer, 0, ballBufferValues);
  device.queue.writeBuffer(canvasSizeBuffer, 0, canvasSizeBufferValues);

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
