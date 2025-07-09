struct Colors {
    r: f32,
    g: f32,
    b: f32,
    a: f32,
};

@group(0) @binding(0) var<uniform> colors: Colors;


@fragment
fn main() -> @location(0) vec4f {
    var point = vec2f(0.5, 0.5);
    return vec4f(colors.r, colors.g, colors.b, colors.a);
}