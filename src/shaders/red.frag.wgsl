struct Colors {
    r: f32,
    g: f32,
    b: f32,
    a: f32,
};

struct Ball {
    x: f32,
    y: f32,
    radius: f32,
};

struct CanvasSize {
    width: f32,
    height: f32,
};

@group(0) @binding(0) var<uniform> colors: Colors;
@group(0) @binding(1) var<storage, read> balls: array<Ball>;
@group(0) @binding(2) var<uniform> canvas_size: CanvasSize;

const BASE_COLOR = vec4f(0.0, 0.0, 0.0, 1.0);
const MIN_BALL_THRESHOLD = 0.0;
const MAX_BALL_THRESHOLD = 0.8;
const BALL_COLOR = vec4f(1.0, 0.0, 0.0, 1.0);

@fragment
fn main(@builtin(position) coord: vec4f) -> @location(0) vec4f {
    let test = colors.r;

    let canvas_size = vec2f(canvas_size.width, canvas_size.height);
    let uv = coord.xy / canvas_size;

    var out = vec4f(0.0, 0.0, 0.0, 0.0);
    for (var i = 0u; i < arrayLength(&balls); i++) {
        let ballDistance = length(uv - vec2f(balls[i].x, balls[i].y));

        if ballDistance < balls[i].radius {
            let threshold = 1 - (ballDistance / balls[i].radius); // 0 at center, 1 at edge

            let actual_threshold = mix(MIN_BALL_THRESHOLD, MAX_BALL_THRESHOLD, threshold);
            out += BALL_COLOR * actual_threshold;
        }
    }

    return out;
}