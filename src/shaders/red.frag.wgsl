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
const METABALL_THRESHOLD = 1.0;
const BALL_COLOR = vec4f(1.0, 0.0, 0.0, 1.0);

@fragment
fn main(@builtin(position) coord: vec4f) -> @location(0) vec4f {
    let test = colors.r;

    let canvas_size = vec2f(canvas_size.width, canvas_size.height);
    let uv = (coord.xy / canvas_size);

    // for (var i = 0u; i < arrayLength(&balls); i++) {
    //     let ballDistance = length(uv - vec2f(balls[i].x, balls[i].y));

    //     if ballDistance < balls[i].radius {
    //         let threshold = 1 - (ballDistance / balls[i].radius); // 0 at center, 1 at edge

    //         let actual_threshold = mix(MIN_BALL_THRESHOLD, MAX_BALL_THRESHOLD, threshold);
    //         out += BALL_COLOR * actual_threshold;
    //     }
    // }

    var sum = 0.0;
    for (var i = 0u; i < arrayLength(&balls); i++) {
        let ball_pos = vec2f(balls[i].x, balls[i].y);
        let influence = get_metaball(uv, ball_pos, balls[i].radius);
        sum += influence;
    }

    var color = BASE_COLOR;
    if sum >= METABALL_THRESHOLD {
        let intensity = min(sum / METABALL_THRESHOLD, 2.0);
        color = mix(BASE_COLOR, BALL_COLOR, intensity * 0.8);
    }

    return color;
}

fn get_metaball(pos: vec2f, ball_pos: vec2f, radius: f32) -> f32 {
    let dist_sq = pow(ball_pos.x - pos.x, 2.0) + pow(ball_pos.y - pos.y, 2.0);
    return (radius * radius) / (dist_sq + 0.0001);
}