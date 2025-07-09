import "./style.css";

// ?raw to make vite import as string
import triangleVertWGSL from "./shaders/triangle.vert.wgsl?raw";
import redFragWGSL from "./shaders/red.frag.wgsl?raw";

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

// color uniform
const colorUniformSize = 4;
const colorBuffer = device.createBuffer({
  size: colorUniformSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const colorBufferValues = new Float32Array(colorUniformSize / 4);
colorBufferValues[0] = 1;

const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: colorBuffer } }],
});

// ********************************************************

function frame() {
  const color = Math.sin(Date.now() / 500);
  const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();

  colorBufferValues[0] = color;

  device.queue.writeBuffer(colorBuffer, 0, colorBufferValues);

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
