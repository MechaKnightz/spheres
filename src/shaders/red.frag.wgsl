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

@fragment
fn main(@builtin(position) coord: vec4f) -> @location(0) vec4f {
    let canvas_size = vec2f(canvas_size.width, canvas_size.height);
    let uv = coord.xy / canvas_size;
    
    // Check if we're inside any ball
    var inside_ball = false;
    for (var i = 0u; i < arrayLength(&balls); i++) {
        let ball = balls[i];
        let distance = length(uv - vec2f(ball.x, ball.y));
        if distance < ball.radius {
            inside_ball = true;
            break;
        }
    }
    
    // If inside a ball, use white color, otherwise use the animated colors
    if inside_ball {
        return vec4f(1.0, 1.0, 1.0, 1.0);
    } else {
        return vec4f(colors.r, colors.g, colors.b, colors.a);
    }
}